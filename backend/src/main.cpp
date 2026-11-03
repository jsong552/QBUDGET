#include "httplib.h"
#include <cstdlib>
#include <iostream>
#include <string>

int main() {
    int port = 8080;
    if (const char* value = std::getenv("PORT")) {
        try {
            std::string text(value);
            if (text.empty() || text.find_first_not_of("0123456789") != std::string::npos)
                throw std::invalid_argument("PORT");
            port = std::stoi(text);
            if (port < 1 || port > 65535) throw std::out_of_range("PORT");
        } catch (const std::exception&) {
            std::cerr << "PORT must be an integer between 1 and 65535.\n";
            return 1;
        }
    }
    const char* configured_origin = std::getenv("FRONTEND_ORIGIN");
    const std::string origin = configured_origin ? configured_origin : "http://localhost:5173";
    httplib::Server server;
    server.set_post_routing_handler([origin](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Vary", "Origin");
        if (req.get_header_value("Origin") == origin) {
            res.set_header("Access-Control-Allow-Origin", origin);
            res.set_header("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.set_header("Access-Control-Allow-Headers", "Authorization, Content-Type");
        }
    });
    server.Options(R"(/api/.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204;
    });
    server.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(R"({"status":"ok"})", "application/json");
    });
    server.Get("/api/hello", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(R"({"message":"Hello from the QBUDGET C++ backend!"})", "application/json");
    });
    server.set_error_handler([](const httplib::Request&, httplib::Response& res) {
        res.set_content(R"({"error":"Request could not be handled"})", "application/json");
    });
    std::cout << "QBUDGET API listening on port " << port << std::endl;
    if (!server.listen("0.0.0.0", port)) {
        std::cerr << "Could not start server. Is the port already in use?\n";
        return 1;
    }
}
