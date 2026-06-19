from flask import Flask, jsonify
from flask_cors import CORS
from api.routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(api_bp)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5001)
