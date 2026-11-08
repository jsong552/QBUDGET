#pragma once
#include "httplib.h"
#include "firebase.hpp"
#include <algorithm>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <map>
#include <cmath>

namespace qbudget {
inline void require(bool ok, const std::string& message) { if(!ok) throw ApiError(400,message); }
inline std::string text(const Json& data,const std::string& key,size_t max=200) {
    require(data.contains(key)&&data[key].is_string(),"Missing text field: "+key);
    auto value=data[key].get<std::string>();
    require(!value.empty()&&value.size()<=max&&value.find_first_not_of(" \t\r\n")!=std::string::npos,"Invalid "+key);
    return value;
}
inline int64_t money(const Json& data,const std::string& key) {
    require(data.contains(key)&&data[key].is_number_integer(),key+" must be integer cents.");
    auto value=data[key].get<int64_t>();
    require(value>=-100000000000LL&&value<=100000000000LL,"Amount exceeds the supported limit."); return value;
}
inline std::time_t utc(std::tm* tm) {
#ifdef _WIN32
    return _mkgmtime(tm);
#else
    return timegm(tm);
#endif
}
inline std::tm utcParts(std::time_t time) {
    std::tm result{};
#ifdef _WIN32
    gmtime_s(&result,&time);
#else
    gmtime_r(&time,&result);
#endif
    return result;
}
inline std::string dateString(std::tm tm) { std::ostringstream s; s<<std::put_time(&tm,"%Y-%m-%d"); return s.str(); }
inline std::time_t dateTime(const std::string& date) {
    require(date.size()==10&&date[4]=='-'&&date[7]=='-',"Use a date in YYYY-MM-DD format.");
    for(size_t i=0;i<date.size();i++) if(i!=4&&i!=7) require(date[i]>='0'&&date[i]<='9',"Invalid date.");
    std::tm tm{}; tm.tm_year=std::stoi(date.substr(0,4))-1900; tm.tm_mon=std::stoi(date.substr(5,2))-1; tm.tm_mday=std::stoi(date.substr(8,2));
    require(tm.tm_year>=70&&tm.tm_year<=200,"Dates must be between 1970 and 2100.");
    auto timestamp=utc(&tm); require(dateString(utcParts(timestamp))==date,"Invalid calendar date."); return timestamp;
}
inline std::string today() { return dateString(utcParts(std::time(nullptr))); }
inline std::string shiftDays(const std::string& date,int days) { return dateString(utcParts(dateTime(date)+days*86400LL)); }
inline std::string monthStart(const std::string& date,int offset=0) { auto tm=utcParts(dateTime(date)); tm.tm_mday=1; tm.tm_mon+=offset; return dateString(utcParts(utc(&tm))); }
inline std::string termStart(const std::string& date) { auto tm=utcParts(dateTime(date)); tm.tm_mon=(tm.tm_mon/4)*4; tm.tm_mday=1; return dateString(tm); }
inline int daysBetween(const std::string& start,const std::string& end) { return static_cast<int>((dateTime(end)-dateTime(start))/86400); }
inline std::string lower(std::string value) { for(char& c:value) c=static_cast<char>(std::tolower(static_cast<unsigned char>(c))); return value; }
inline int percent(int64_t amount,int64_t total) { return total<=0?0:static_cast<int>(std::min(100.0,std::round(100.0*amount/total))); }
inline Json categories() { return Json::array({{{"id","groceries"},{"name","Groceries"}},{{"id","food"},{"name","Food"}},{{"id","dining"},{"name","Dining"}},{{"id","housing"},{"name","Housing"}},{{"id","school"},{"name","School"}},{{"id","transportation"},{"name","Transportation"}},{{"id","utilities"},{"name","Utilities"}},{{"id","income"},{"name","Income"}},{{"id","other"},{"name","Other"}}}); }
inline Json category(const std::string& id) { for(auto& c:categories()) if(c["id"]==id) return c; throw ApiError(400,"Unknown category."); }
inline Json validateTransaction(const Json& body) {
    auto date=text(body,"date"); dateTime(date);
    auto type=text(body,"type"); require(type=="income"||type=="expense","Invalid transaction type.");
    auto amount=money(body,"amountCents"); require((type=="income"&&amount>0)||(type=="expense"&&amount<0),"Income must be positive and expenses negative.");
    auto cat=text(body,"categoryId"); category(cat);
    return {{"date",date},{"description",text(body,"description")},{"categoryId",cat},{"type",type},{"amountCents",amount}};
}
inline Json validateGoal(const Json& body) {
    auto kind=text(body,"kind"); require(kind=="savings"||kind=="spending_limit","Invalid goal type.");
    auto amount=money(body,"targetCents"); require(amount>0,"Goal target must be positive.");
    return {{"kind",kind},{"title",text(body,"title")},{"targetCents",amount}};
}
inline Json validateEvent(const Json& body) {
    auto date=text(body,"date"); dateTime(date); auto amount=money(body,"amountCents"); require(amount>0,"Payment amount must be positive.");
    require(body.contains("hasReminder")&&body["hasReminder"].is_boolean(),"Invalid reminder setting.");
    return {{"date",date},{"title",text(body,"title")},{"kind",text(body,"kind",40)},{"amountCents",amount},{"hasReminder",body["hasReminder"]}};
}
inline std::string param(const httplib::Request& req,const std::string& name,const std::string& fallback="") { return req.has_param(name)?req.get_param_value(name):fallback; }
inline Json profile(const Identity& identity,const Json& stored) {
    auto name=stored.is_null()?identity.name:stored.value("fullName",identity.name);
    if(name.empty()) name=identity.email.substr(0,identity.email.find('@'));
    if(name.empty()) name="Student";
    std::istringstream words(name); std::string first,part,initials; words>>first; if(!first.empty() && static_cast<unsigned char>(first[0])<128) initials+=first[0];
    if((words>>part) && static_cast<unsigned char>(part[0])<128) initials+=part[0];
    if(initials.empty()) initials="U";
    for(char& c:initials) if(static_cast<unsigned char>(c)<128) c=static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return {{"id",identity.uid},{"email",identity.email},{"fullName",name},{"firstName",first},{"initials",initials},{"studentId",stored.is_null()?Json(nullptr):stored.value("studentId",Json(nullptr))}};
}
struct Ledger {
    Json transactions; std::string now;
    int64_t income=0,spent=0,monthIncome=0,monthSpent=0,lastIncome=0,lastSpent=0,termSpent=0;
    explicit Ledger(Json rows,std::string date=today()):transactions(std::move(rows)),now(std::move(date)) {
        for(auto& row:transactions) {
            // Also validate stored data: clients may write through Firebase directly.
            auto valid=validateTransaction(row); row.update(valid);
            std::string d=row["date"]; if(d>now) continue;
            auto amount=row["amountCents"].get<int64_t>();
            income+=std::max<int64_t>(0,amount); spent+=std::max<int64_t>(0,-amount);
            if(d>=monthStart(now)) { monthIncome+=std::max<int64_t>(0,amount); monthSpent+=std::max<int64_t>(0,-amount); }
            else if(d>=monthStart(now,-1)) { lastIncome+=std::max<int64_t>(0,amount); lastSpent+=std::max<int64_t>(0,-amount); }
            if(d>=termStart(now)) termSpent+=std::max<int64_t>(0,-amount);
        }
    }
    Json breakdown(const std::string& start) const {
        std::map<std::string,int64_t> totals; int64_t total=0;
        for(auto& row:transactions) { std::string date=row["date"]; auto amount=row["amountCents"].get<int64_t>(); if(date>=start&&date<=now&&amount<0) {totals[row["categoryId"].get<std::string>()]-=amount;total-=amount;} }
        Json items=Json::array(); for(auto& [id,amount]:totals) items.push_back({{"category",category(id)},{"amountCents",amount},{"percent",percent(amount,total)}});
        return {{"totalCents",total},{"items",items}};
    }
    Json points(const std::string& start,const std::string& mode,bool incoming) const {
        std::map<std::string,int64_t> totals;
        for(auto& row:transactions) {
            std::string date=row["date"]; if(date<start||date>now) continue;
            if(mode=="monthly") date=monthStart(date);
            else if(mode=="semester") date=termStart(date);
            else if(mode=="weekly") { auto day=utcParts(dateTime(date)).tm_wday; date=shiftDays(date,-((day+6)%7)); }
            auto amount=row["amountCents"].get<int64_t>(); totals[date]+=incoming?std::max<int64_t>(0,amount):std::max<int64_t>(0,-amount);
        }
        Json result=Json::array(); for(auto& [date,amount]:totals) result.push_back({{"date",date},{"amountCents",amount}}); return result;
    }
};
inline Json preferences() { return {{"theme","light"},{"currency","CAD"},{"weekStart","sunday"},{"dateFormat","MMM_DD_YYYY"}}; }
inline Json notificationPreferences() { return Json::array({{{"key","payment_reminders"},{"title","Payment reminders"},{"description","Show upcoming payment reminders in the app."},{"enabled",true}},{{"key","forecast_updates"},{"title","Forecast updates"},{"description","Reserved for future forecast alerts."},{"enabled",false}},{{"key","goal_updates"},{"title","Goal updates"},{"description","Reserved for future goal alerts."},{"enabled",false}},{{"key","product_announcements"},{"title","Product announcements"},{"description","Reserved for future announcements."},{"enabled",false}}}); }
inline Json settings(const Firestore& db,const std::string& name,Json defaults) { auto stored=db.get("/settings/"+name); if(!stored.is_null()) defaults.update(stored); return defaults; }
inline Json events(const Firestore& db) { auto rows=db.list("events"); for(auto& row:rows) { auto valid=validateEvent(row); row.update(valid); row["shortTitle"]=row["title"]; } std::sort(rows.begin(),rows.end(),[](const Json& a,const Json& b){return a["date"]<b["date"];}); return rows; }
inline Json handleData(const httplib::Request& req,const Identity& identity,const Firestore& db) {
    const auto& path=req.path; const auto& method=req.method; auto now=today();
    Json body=Json::object();
    if(method=="POST"||method=="PUT"||method=="PATCH") { try {body=Json::parse(req.body);} catch(...) {throw ApiError(400,"Send a valid JSON object.");} require(body.is_object(),"Send a JSON object."); }
    if(path=="/api/me") {
        if(method=="GET") return profile(identity,db.get(""));
        if(method=="PUT"||method=="POST") {
            auto name=text(body,"fullName",100); auto student=body.value("studentId",Json(nullptr)); require(student.is_null()||(student.is_string()&&student.get<std::string>().size()<=40),"Invalid student ID.");
            Json stored={{"fullName",name},{"studentId",student}};db.put("",stored);return profile(identity,stored);
        }
    }
    if(path=="/api/me/preferences") {
        if(method=="GET") return settings(db,"display",preferences());
        if(method=="PATCH") {
            auto defaults=preferences(); Json allowed={{"theme",{"light","dark","system"}},{"currency",{"CAD"}},{"weekStart",{"sunday","monday"}},{"dateFormat",{"MMM_DD_YYYY","DD_MM_YYYY","YYYY_MM_DD"}}};
            for(auto it=body.begin();it!=body.end();++it) {require(allowed.contains(it.key()),"Unknown preference."); require(std::find(allowed[it.key()].begin(),allowed[it.key()].end(),it.value())!=allowed[it.key()].end(),"Unsupported preference value. Amounts are currently CAD only.");}
            require(!body.empty(),"No preferences supplied.");db.put("/settings/display",body);return nullptr;
        }
    }
    if(path=="/api/calendar/reminders") {
        if(method=="GET") return settings(db,"reminders",{{"emailEnabled",false},{"leadTime","1_day"}});
        if(method=="PUT") {require(body.contains("emailEnabled")&&body["emailEnabled"]==false,"Email delivery is not implemented. Use in-app reminders.");auto lead=text(body,"leadTime");require(lead=="1_day"||lead=="3_days"||lead=="1_week","Invalid lead time.");db.put("/settings/reminders",{{"emailEnabled",false},{"leadTime",lead}});return nullptr;}
    }
    if(path=="/api/me/notification-preferences"&&method=="GET") {
        auto values=notificationPreferences(); auto stored=db.get("/settings/notifications");
        for(auto& value:values) if(!stored.is_null()&&stored.contains(value["key"].get<std::string>())) value["enabled"]=stored[value["key"].get<std::string>()];
        return values;
    }
    const std::string notificationPrefix="/api/me/notification-preferences/";
    if(path.rfind(notificationPrefix,0)==0&&method=="PATCH") {
        auto key=path.substr(notificationPrefix.size());bool known=false;for(auto& p:notificationPreferences()) if(p["key"]==key) known=true;
        require(known&&body.contains("enabled")&&body["enabled"].is_boolean(),"Invalid notification preference."); db.put("/settings/notifications",{{key,body["enabled"]}});return nullptr;
    }
    for(const std::string collection:{"transactions","goals","events"}) {
        std::string route=collection=="events"?"/api/calendar/events":"/api/"+collection;
        auto validate=[&](const Json& value){return collection=="transactions"?validateTransaction(value):collection=="goals"?validateGoal(value):validateEvent(value);};
        if(path==route&&method=="POST") {db.create(collection,validate(body));return nullptr;}
        if(path.rfind(route+"/",0)==0&&(method=="PUT"||method=="DELETE")) {
            auto id=path.substr(route.size()+1);require(!id.empty()&&id.size()<=150&&id.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")==std::string::npos,"Invalid record ID.");
            if(method=="DELETE") db.remove("/"+collection+"/"+id); else db.put("/"+collection+"/"+id,validate(body),true);return nullptr;
        }
    }
    if(method!="GET") throw ApiError(404,"Endpoint not found.");
    if(path=="/api/categories") return categories();
    if(path=="/api/app/today") {std::ostringstream s;auto tm=utcParts(dateTime(now));s<<std::put_time(&tm,"%A, %B %d, %Y");return s.str();}
    if(path.rfind("/api/calendar/",0)==0||path=="/api/notifications") {
        auto rows=events(db);Json upcoming=Json::array();int64_t total=0;int count=0;
        for(auto& row:rows) {std::string date=row["date"];if(date<now) continue;int days=daysBetween(now,date);if(days<=30){total+=row["amountCents"].get<int64_t>();count++;}upcoming.push_back({{"event",row},{"daysAway",days},{"isUrgent",days<=3}});}
        if(path=="/api/calendar/summary") return {{"upcomingCount",count},{"upcomingTotalCents",total},{"windowDays",30},{"nextPayment",upcoming.empty()?Json(nullptr):Json{{"label",upcoming[0]["event"]["title"]},{"date",upcoming[0]["event"]["date"]},{"amountCents",upcoming[0]["event"]["amountCents"]}}}};
        if(path=="/api/calendar/upcoming") {while(upcoming.size()>4) upcoming.erase(upcoming.end()-1);return upcoming;}
        if(path=="/api/calendar/events") {auto month=param(req,"month",now);if(month.size()==7)month+="-01";month=monthStart(month);Json selected=Json::array();for(auto& row:rows)if(row["date"]>=month&&row["date"]<monthStart(month,1))selected.push_back(row);return {{"month",month},{"today",now},{"events",selected}};}
        if(path=="/api/notifications") {
            auto prefs=db.get("/settings/notifications");Json result=Json::array();if(!prefs.is_null()&&!prefs.value("payment_reminders",true))return result;
            auto reminder=settings(db,"reminders",{{"emailEnabled",false},{"leadTime","1_day"}});std::string lead=reminder["leadTime"];int days=lead=="1_week"?7:lead=="3_days"?3:1;
            for(auto& item:upcoming) if(item["daysAway"].get<int>()<=days&&item["event"]["hasReminder"]==true) result.push_back({{"id",item["event"]["id"]},{"message",item["event"]["title"].get<std::string>()+" is due "+item["event"]["date"].get<std::string>()},{"createdAt",now},{"read",false}});
            return result;
        }
    }
    Ledger ledger(db.list("transactions"),now);auto end=shiftDays(monthStart(now,1),-1);
    if(path=="/api/transactions/summary") return {{"totalIncomeCents",ledger.income},{"totalExpensesCents",ledger.spent},{"remainingBalanceCents",ledger.income-ledger.spent},{"incomeChangeCents",ledger.monthIncome-ledger.lastIncome},{"expensesChangeCents",ledger.monthSpent-ledger.lastSpent},{"incomeChangeLabel","this month vs last month"},{"expensesChangeLabel","this month vs last month"},{"periodEnd",end}};
    if(path=="/api/transactions") {
        Json result=Json::array();auto period=param(req,"period","all_time");auto type=param(req,"type","all");auto cat=param(req,"category","all");auto search=lower(param(req,"search"));
        require(period=="all_time"||period=="this_month"||period=="last_month"||period=="this_term","Invalid period.");
        for(auto row:ledger.transactions) {
            std::string date=row["date"];if(type!="all"&&row["type"]!=type)continue;if(cat!="all"&&row["categoryId"]!=cat)continue;
            if(!search.empty()&&lower(row["description"].get<std::string>()).find(search)==std::string::npos)continue;
            if(period=="this_month"&&(date<monthStart(now)||date>=monthStart(now,1)))continue;
            if(period=="last_month"&&(date<monthStart(now,-1)||date>=monthStart(now)))continue;
            if(period=="this_term"&&(date<termStart(now)||date>=monthStart(termStart(now),4)))continue;
            row["category"]=category(row["categoryId"]);row.erase("categoryId");result.push_back(row);
        }
        auto key=param(req,"sort","date");auto direction=param(req,"direction","desc");require(key=="date"||key=="description"||key=="category"||key=="type"||key=="amount","Invalid sort key.");require(direction=="asc"||direction=="desc","Invalid sort direction.");
        std::sort(result.begin(),result.end(),[&](const Json& a,const Json& b){auto value=[&](const Json& row)->Json{return key=="category"?row["category"]["name"]:row[key=="amount"?"amountCents":key];};return direction=="asc"?value(a)<value(b):value(a)>value(b);});return result;
    }
    if(path=="/api/goals"||path=="/api/dashboard/summary") {
        auto goals=db.list("goals");int64_t budget=0;
        for(auto& goal:goals) {auto valid=validateGoal(goal);goal.update(valid);bool limit=goal["kind"]=="spending_limit";if(limit)budget+=goal["targetCents"].get<int64_t>();auto current=limit?ledger.monthSpent:std::max<int64_t>(0,ledger.income-ledger.spent);goal["currentCents"]=current;goal["percent"]=percent(current,goal["targetCents"]);}
        if(path=="/api/goals")return goals;
        // With no explicit spending-limit goals, available monthly income is the budget.
        if(budget==0)budget=ledger.monthIncome;
        int remaining=daysBetween(now,end)+1;int64_t balance=ledger.income-ledger.spent;
        return {{"greeting","Welcome"},{"availableBalanceCents",balance},{"periodEnd",end},{"budgetStatus",ledger.monthSpent>budget?"over_budget":"on_track"},{"spentCents",ledger.monthSpent},{"budgetCents",budget},{"spentPercent",percent(ledger.monthSpent,budget)},{"spentThisMonthCents",ledger.monthSpent},{"spentChangePercent",ledger.lastSpent?static_cast<int64_t>(std::min(9007199254740991.0, std::round(100.0*(ledger.monthSpent-ledger.lastSpent)/ledger.lastSpent))):0},{"spentChangeLabel",ledger.lastSpent?"from last month":"no prior-month spending"},{"dailyAllowanceCents",std::max<int64_t>(0,std::min(balance,budget-ledger.monthSpent))/remaining},{"daysRemaining",remaining}};
    }
    if(path=="/api/dashboard/categories")return ledger.breakdown(monthStart(now));
    if(path=="/api/dashboard/activity") {auto range=param(req,"range","month");require(range=="week"||range=="month"||range=="term","Invalid activity range.");return {{"range",range},{"points",ledger.points(range=="week"?shiftDays(now,-6):range=="term"?termStart(now):monthStart(now),"daily",false)},{"highlight",nullptr}};}
    if(path=="/api/forecast/categories")return ledger.breakdown(termStart(now));
    if(path.rfind("/api/forecast/",0)==0) {
        auto rows=events(db);auto horizon=monthStart(now,4);int64_t scheduled=0;
        for(auto& row:rows)if(row["date"]>=now&&row["date"]<horizon)scheduled+=row["amountCents"].get<int64_t>();
        if(path=="/api/forecast/summary")return {{"projectedIncomeCents",0},{"projectedIncomeCaption","No future income assumed"},{"projectedExpensesCents",scheduled},{"projectedExpensesCaption","Scheduled payments through "+shiftDays(horizon,-1)},{"projectedBalanceCents",ledger.income-ledger.spent-scheduled},{"projectedBalanceCaption","Current balance minus scheduled payments"},{"termLabel","Current four-month term"}};
        if(path=="/api/forecast/monthly") {Json months=Json::array();auto balance=ledger.income-ledger.spent;for(int i=0;i<4;i++){auto start=monthStart(now,i);auto finish=monthStart(now,i+1);int64_t expenses=0;for(auto& row:rows)if(row["date"]>=now&&row["date"]>=start&&row["date"]<finish)expenses+=row["amountCents"].get<int64_t>();balance-=expenses;months.push_back({{"month",start},{"incomeCents",0},{"expensesCents",expenses},{"projectedBalanceCents",balance}});}return {{"description","Scheduled payments only; no future income or unrecorded spending assumed."},{"months",months}};}
        if(path=="/api/forecast/series") {auto mode=param(req,"granularity","monthly");require(mode=="weekly"||mode=="monthly"||mode=="semester","Invalid forecast granularity.");std::map<std::string,int64_t> future;for(auto& row:rows)if(row["date"]>=now&&row["date"]<horizon){std::string d=row["date"];if(mode=="monthly")d=monthStart(d);else if(mode=="semester")d=termStart(d);else d=shiftDays(d,-((utcParts(dateTime(d)).tm_wday+6)%7));future[d]+=row["amountCents"].get<int64_t>();}Json projected=Json::array();for(auto& [d,amount]:future)projected.push_back({{"date",d},{"amountCents",amount}});return {{"granularity",mode},{"income",ledger.points(termStart(now),mode,true)},{"expenses",ledger.points(termStart(now),mode,false)},{"projectedExpenses",projected}};}
    }
    throw ApiError(404,"Endpoint not found.");
}
} // namespace qbudget
