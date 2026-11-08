#include "../src/budget.hpp"
#include <cassert>
#include <iostream>
using namespace qbudget;
void fails(int code,const std::function<void()>& action) {
    bool caught=false;try{action();}catch(const ApiError& error){caught=true;assert(error.status==code);}assert(caught);
}
Json expense(std::string date,int64_t amount=-2450) { return {{"id","expense-1"},{"date",date},{"description","Groceries"},{"categoryId","groceries"},{"type","expense"},{"amountCents",amount}}; }
int main() {
#ifdef _WIN32
    _putenv_s("FIREBASE_PROJECT_ID","test-project");_putenv_s("FIREBASE_API_KEY","test-key");
#else
    setenv("FIREBASE_PROJECT_ID","test-project",1);setenv("FIREBASE_API_KEY","test-key",1);
#endif
    assert(shiftDays("2024-02-28",1)=="2024-02-29");
    assert(monthStart("2026-12-25",1)=="2027-01-01");
    fails(400,[]{dateTime("2025-02-29");});
    fails(400,[]{validateTransaction(expense("2026-11-07",100));});
    fails(400,[]{auto data=expense("2026-11-07");data["amountCents"]=1.5;validateTransaction(data);});
    fails(400,[]{auto data=expense("2026-11-07");data["ownerUid"]="someone-else";data["categoryId"]="invalid";validateTransaction(data);});
    auto incoming=expense("2026-11-01",100000);incoming["type"]="income";
    Ledger ledger(Json::array({incoming,expense("2026-11-07"),expense("2026-10-15",-1000),expense("2026-12-01",-9999)}),"2026-11-07");
    assert(ledger.income==100000&&ledger.spent==3450&&ledger.monthSpent==2450&&ledger.lastSpent==1000);
    assert(ledger.breakdown("2026-11-01")["totalCents"]==2450);
    Ledger empty(Json::array(),"2026-11-07");assert(empty.income==0&&empty.spent==0&&empty.breakdown("2026-11-01")["items"].empty());
    Json record={{"name","Alex"},{"amountCents",-2450},{"studentId",nullptr},{"enabled",true},{"nested",{{"a",1}}}};
    assert(document({{"fields",toValue(record)["mapValue"]["fields"]}})==record);
    fails(401,[]{authenticate("");});
    auto identity=authenticate("Bearer valid-token",[](const auto& host,const auto&,const auto&,const auto& body,const auto&)->HttpResult {
        assert(host=="identitytoolkit.googleapis.com");assert(Json::parse(body)["idToken"]=="valid-token");
        return {200,R"({"users":[{"localId":"alice","email":"alice@example.com"}]})"};
    });
    assert(identity.uid=="alice");
    fails(401,[]{authenticate("Bearer expired",[](const auto&,const auto&,const auto&,const auto&,const auto&)->HttpResult{return {400,"{}"};});});
    fails(502,[]{authenticate("Bearer valid",[](const auto&,const auto&,const auto&,const auto&,const auto&)->HttpResult{return {503,"{}"};});});
    int calls=0;
    Firestore db(identity,[&](const auto& host,const auto& method,const auto& path,const auto& body,const auto& token)->HttpResult {
        assert(host=="firestore.googleapis.com"&&token=="valid-token");
        assert(path.find("/documents/users/alice")!=std::string::npos);
        if(method=="GET") {
            calls++;
            if(calls==1)return {200,R"({"documents":[{"name":"projects/test/databases/(default)/documents/users/alice/transactions/a","fields":{"amountCents":{"integerValue":"-2450"}}}],"nextPageToken":"next"})"};
            assert(path.find("pageToken=next")!=std::string::npos);return {200,"{}"};
        }
        if(method=="PATCH") {assert(path.find("currentDocument.exists=true")!=std::string::npos);assert(Json::parse(body)["fields"]["amountCents"]["integerValue"]=="-2450");}
        return {200,"{}"};
    });
    auto rows=db.list("transactions");assert(calls==2&&rows.size()==1&&rows[0]["id"]=="a");
    db.put("/transactions/a",{{"amountCents",-2450}},true);
    Firestore denied(identity,[](const auto&,const auto&,const auto&,const auto&,const auto&)->HttpResult{return {403,"{}"};});
    fails(403,[&]{denied.list("transactions");});
    Firestore missing(identity,[](const auto&,const auto&,const auto&,const auto&,const auto&)->HttpResult{return {404,"{}"};});
    assert(missing.get("").is_null());
    fails(404,[&]{missing.list("transactions");});
    // Empty authenticated accounts have zero summaries and no invented calendar payments.
    Firestore blank(identity,[](const auto&,const auto&,const auto& path,const auto&,const auto&)->HttpResult {
        if(path.find("/settings/")!=std::string::npos)return {404,"{}"};
        return {200,"{}"};
    });
    httplib::Request request;request.method="GET";request.path="/api/dashboard/summary";
    assert(handleData(request,identity,blank)["availableBalanceCents"]==0);
    request.path="/api/calendar/summary";assert(handleData(request,identity,blank)["nextPayment"].is_null());
    request.path="/api/forecast/monthly";assert(handleData(request,identity,blank)["months"].size()==4);
    request.method="POST";request.path="/api/transactions";request.body=expense("2026-11-07",0).dump();fails(400,[&]{handleData(request,identity,blank);});
    request.method="DELETE";request.path="/api/transactions/../../bob";fails(400,[&]{handleData(request,identity,blank);});
    std::cout<<"Backend data, authentication, transport and ownership-path tests passed.\n";
}
