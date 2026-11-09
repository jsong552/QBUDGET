// Validated UTC calendar dates and half-open budget periods. No database or HTTP dependency.
#pragma once
#include "errors.hpp"
#include <ctime>
#include <iomanip>
#include <sstream>
#include <algorithm>
namespace qbudget {
inline std::time_t utc(std::tm *tm) {
#ifdef _WIN32
    return _mkgmtime(tm);
#else
    return timegm(tm);
#endif
}
inline std::tm utcParts(std::time_t time) {
    std::tm result{};
#ifdef _WIN32
    gmtime_s(&result, &time);
#else
    gmtime_r(&time, &result);
#endif
    return result;
}
inline std::string dateString(std::tm tm) {
    std::ostringstream s;
    s << std::put_time(&tm, "%Y-%m-%d");
    return s.str();
}
inline std::time_t dateTime(const std::string &date) {
    require(date.size() == 10 && date[4] == '-' && date[7] == '-', "Use a date in YYYY-MM-DD format.");
    for (size_t i = 0; i < date.size(); i++)
        if (i != 4 && i != 7)
            require(date[i] >= '0' && date[i] <= '9', "Invalid date.");
    std::tm tm{};
    tm.tm_year = std::stoi(date.substr(0, 4)) - 1900;
    tm.tm_mon = std::stoi(date.substr(5, 2)) - 1;
    tm.tm_mday = std::stoi(date.substr(8, 2));
    require(tm.tm_year >= 70 && tm.tm_year <= 200, "Dates must be between 1970 and 2100.");
    auto timestamp = utc(&tm);
    require(dateString(utcParts(timestamp)) == date, "Invalid calendar date.");
    return timestamp;
}
inline std::string today() {
    return dateString(utcParts(std::time(nullptr)));
}
inline std::string shiftDays(const std::string &date, int days) {
    return dateString(utcParts(dateTime(date) + days * 86400LL));
}
inline std::string monthStart(const std::string &date, int offset = 0) {
    auto tm = utcParts(dateTime(date));
    tm.tm_mday = 1;
    tm.tm_mon += offset;
    return dateString(utcParts(utc(&tm)));
}
inline std::string termStart(const std::string &date) {
    auto tm = utcParts(dateTime(date));
    tm.tm_mon = (tm.tm_mon / 4) * 4;
    tm.tm_mday = 1;
    return dateString(tm);
}
inline int daysBetween(const std::string &start, const std::string &end) {
    return static_cast<int>((dateTime(end) - dateTime(start)) / 86400);
}

class Date {
    std::string value_ = "1970-01-01";

  public:
    Date() = default;
    explicit Date(std::string value) : value_(std::move(value)) {
        dateTime(value_);
    }
    static Date current() {
        return Date(today());
    }
    const std::string &str() const {
        return value_;
    }
    Date addDays(int count) const {
        return Date(shiftDays(value_, count));
    }
    Date startOfMonth(int offset = 0) const {
        return Date(monthStart(value_, offset));
    }
    Date startOfTerm() const {
        return Date(termStart(value_));
    }
    Date startOfWeek() const {
        return addDays(-((utcParts(dateTime(value_)).tm_wday + 6) % 7));
    }
    int daysUntil(const Date &other) const {
        return daysBetween(value_, other.value_);
    }
    Date addMonths(int count) const {
        auto start = startOfMonth(count);
        int day = std::stoi(value_.substr(8, 2));
        int days = start.daysUntil(start.startOfMonth(1));
        return start.addDays(std::min(day, days) - 1);
    }
    bool operator<(const Date &other) const {
        return value_ < other.value_;
    }
    bool operator<=(const Date &other) const {
        return value_ <= other.value_;
    }
    bool operator==(const Date &other) const {
        return value_ == other.value_;
    }
};
enum class BudgetPeriod { Weekly, Monthly, Semester };
struct DateRange {
    Date start;
    Date end; // exclusive; resets are a new range, never deletion of history
    bool contains(const Date &date) const {
        return start <= date && date < end;
    }
    static DateRange containing(const Date &date, BudgetPeriod period) {
        if (period == BudgetPeriod::Weekly) {
            auto start = date.startOfWeek();
            return {start, start.addDays(7)};
        }
        if (period == BudgetPeriod::Monthly) {
            auto start = date.startOfMonth();
            return {start, start.startOfMonth(1)};
        }
        auto start = date.startOfTerm();
        return {start, start.startOfMonth(4)};
    }
};
} // namespace qbudget
