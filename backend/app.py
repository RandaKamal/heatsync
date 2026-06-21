from flask import Flask, Response, jsonify
from flask_cors import CORS

from api.routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(api_bp)

    @app.errorhandler(404)
    def not_found(e: Exception) -> tuple[Response, int]:
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e: Exception) -> tuple[Response, int]:
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=False, port=5001)
