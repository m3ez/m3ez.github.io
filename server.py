
import sys
import base64
from http.server import HTTPServer
import six

if six.PY2:
    from SimpleHTTPServer import SimpleHTTPRequestHandler
else:
    from http.server import SimpleHTTPRequestHandler

from colored_logger import ColoredLogger
log = ColoredLogger()

# Define your basic authentication credentials (username and password)
USERNAME = "m3ez"
PASSWORD = "m3ez@1234!"
log.info(f"{USERNAME}:{PASSWORD}")
# Custom request handler class that checks for basic authentication
class AuthHandler(SimpleHTTPRequestHandler):
    def do_AUTHHEAD(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Restricted"')
        self.send_header("Content-type", "text/html")
        self.end_headers()

    def do_GET(self):
        auth_header = self.headers.get("Authorization")
        if auth_header is None or not auth_header.startswith("Basic "):
            self.do_AUTHHEAD()
            self.wfile.write(b"Authentication required")
        else:
            # Extract and decode the username and password from the Authorization header
            encoded_credentials = auth_header.split(" ")[1]
            decoded_credentials = base64.b64decode(encoded_credentials).decode("utf-8")
            username, password = decoded_credentials.split(":")

            # Check if the provided username and password match the predefined credentials
            if username == USERNAME and password == PASSWORD:
                # If authentication succeeds, continue with the default request handling
                SimpleHTTPRequestHandler.do_GET(self)
            else:
                self.do_AUTHHEAD()
                self.wfile.write(b"Authentication failed")

def run_server(port):
    server_address = ("", port)
    httpd = HTTPServer(server_address, AuthHandler)
    log.info("Server started at http://localhost:{}/".format(port))
    httpd.serve_forever()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            run_server(port)
        except ValueError:
            log.error("Invalid port number. Please provide a valid integer port.")
    else:
        run_server(8000)
