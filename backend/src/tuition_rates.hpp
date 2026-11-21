// Hard-coded undergraduate tuition estimates. These are not live data and must be reviewed by hand whenever
// Queen's publishes new rates (usually effective September 1).
// Source: https://www.queensu.ca/registrar/tuition-fees/undergraduate  (2026-2027 Fall/Winter, per unit).
// Only tuition is estimated: Student Assistance Levy, ancillary fees and UHIP are not included. A rate of 0
// means the page has no single per-unit rate for that combination (e.g. it changes by year of study), so no
// estimate is offered and the student enters their own rate.
#pragma once
#include "codecs.hpp"
#include <algorithm>
#include <array>
#include <cctype>
namespace qbudget {
inline constexpr const char *tuitionRatesYear = "2026-2027";
inline constexpr const char *tuitionRatesSource =
    "https://www.queensu.ca/registrar/tuition-fees/undergraduate";
// ASSUMPTION: the source page charges per unit and does not say how many units a course is worth. A standard
// Queen's course is 3 units; half-courses and 6-unit courses will be over- or under-estimated.
inline constexpr int unitsPerCourse = 3;

enum class Residency { Ontario = 0, OutOfProvince = 1, International = 2 };
struct ResidencyInfo {
    Residency residency;
    const char *key, *label;
    std::vector<const char *> aliases;
};
struct TuitionProgram {
    const char *key, *label;
    std::array<MoneyCents, 3> perUnitCents; // indexed by Residency; 0 = no single published rate
    std::vector<const char *> aliases;      // matched against the normalized faculty text, in table order
};
inline const std::vector<ResidencyInfo> &residencies() {
    static const std::vector<ResidencyInfo> list = {
        {Residency::Ontario, "ontario", "Ontario", {"ontario"}},
        {Residency::OutOfProvince, "out_of_province", "Out of Province", {"out of province", "oop"}},
        {Residency::International, "international", "International", {"international"}}};
    return list;
}
// Order matters: more specific programs come first so "Health Sciences" is not read as "Arts & Science" and
// "Computer Engineering" is read as Engineering.
inline const std::vector<TuitionProgram> &tuitionPrograms() {
    static const std::vector<TuitionProgram> list = {
        {"health_sciences", "Health Sciences (On Campus)", {20682, 25876, 0}, {"health"}},
        {"nursing", "Nursing", {20682, 25876, 178239}, {"nursing"}},
        {"engineering", "Smith Engineering", {37742, 47222, 184111}, {"engineer", "applied sci"}},
        {"arts_science_computing",
         "Arts & Science - Computing (Years 1-4)",
         {28470, 29893, 182694},
         {"comput"}},
        {"commerce", "Smith Business (Commerce)", {50343, 62989, 184362}, {"commerce", "business"}},
        {"education", "Education (Consecutive/Concurrent)", {19991, 19991, 0}, {"education"}},
        {"arts_science", "Arts & Science", {20682, 25876, 149366}, {"arts", "science", "artsci"}}};
    return list;
}
inline std::string normalizeText(const std::string &text) {
    std::string out;
    for (unsigned char c : text) {
        if (c == '&')
            out += " and ";
        else
            out += std::isalnum(c) ? static_cast<char>(std::tolower(c)) : ' ';
    }
    std::string collapsed;
    for (char c : out)
        if (c != ' ' || (!collapsed.empty() && collapsed.back() != ' '))
            collapsed += c;
    while (!collapsed.empty() && collapsed.back() == ' ')
        collapsed.pop_back();
    return collapsed;
}
inline bool containsAny(const std::string &text, const std::vector<const char *> &needles) {
    return std::any_of(needles.begin(), needles.end(),
                       [&](const char *needle) { return text.find(needle) != std::string::npos; });
}
struct TuitionEstimate {
    const TuitionProgram *program = nullptr;
    const ResidencyInfo *residency = nullptr;
    MoneyCents perUnitCents = 0, perCourseCents = 0;
};
// Best-effort match of the student's free-text faculty and status. Returns nothing rather than guessing when
// either cannot be recognised or the page publishes no single rate, so the caller falls back to the rate the
// student entered.
inline std::optional<TuitionEstimate> estimateTuition(const std::string &faculty, const std::string &status) {
    auto program = normalizeText(faculty), residency = normalizeText(status);
    const ResidencyInfo *where = nullptr;
    // Most specific first, so "Out of Province (not Ontario)" is not read as Ontario.
    for (size_t index : {size_t{2}, size_t{1}, size_t{0}})
        if (containsAny(residency, residencies()[index].aliases)) {
            where = &residencies()[index];
            break;
        }
    const TuitionProgram *what = nullptr;
    for (const auto &candidate : tuitionPrograms())
        if (containsAny(program, candidate.aliases)) {
            what = &candidate;
            break;
        }
    if (!what || !where)
        return std::nullopt;
    auto perUnit = what->perUnitCents[static_cast<size_t>(where->residency)];
    if (perUnit <= 0)
        return std::nullopt;
    return TuitionEstimate{what, where, perUnit, perUnit * unitsPerCourse};
}
inline Json tuitionRatesJson() {
    Json programs = Json::array(), places = Json::array();
    for (const auto &program : tuitionPrograms()) {
        Json rates = Json::object();
        for (const auto &info : residencies()) {
            auto value = program.perUnitCents[static_cast<size_t>(info.residency)];
            rates[info.key] = value > 0 ? Json(value) : Json(nullptr);
        }
        programs.push_back({{"key", program.key}, {"label", program.label}, {"perUnitCents", rates}});
    }
    for (const auto &info : residencies())
        places.push_back({{"key", info.key}, {"label", info.label}});
    return {{"academicYear", tuitionRatesYear},
            {"source", tuitionRatesSource},
            {"unitsPerCourse", unitsPerCourse},
            {"programs", programs},
            {"residencies", places}};
}
} // namespace qbudget
