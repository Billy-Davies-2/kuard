package route

import "net/http"

// Router defines minimal methods needed for registering endpoints.
type Router interface {
	GET(pattern string, h http.Handler)
	POST(pattern string, h http.Handler)
	PUT(pattern string, h http.Handler)
	DELETE(pattern string, h http.Handler)
}
