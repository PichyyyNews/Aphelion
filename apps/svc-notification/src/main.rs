use std::env;
use warp::Filter;

#[tokio::main]
async fn main() {
    println!("Starting svc-notification microservice in Rust (Skeleton)...");

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse::<u16>()
        .unwrap_or(8081);

    // GET /health
    let health_route = warp::path("health")
        .map(|| warp::reply::json(&serde_json::json!({ "status": "UP", "service": "notification" })));

    // GET /api/notifications
    let notify_route = warp::path!("api" / "notifications")
        .map(|| warp::reply::json(&serde_json::json!({ "notifications": [], "message": "Notification stack is ready." })));

    let routes = health_route.or(notify_route);

    println!("Notification service listening on port {}", port);
    warp::serve(routes).run(([0, 0, 0, 0], port)).await;
}
