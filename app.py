from flask import Flask, request, render_template, jsonify
import database

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/db-test")
def db_test():
    try:
        db = database.get_db_connection()
        cursor = db.cursor()

        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()

        cursor.close()
        db.close()

        return jsonify({
            "message": "MySQL 연결 성공!",
            "tables": tables
        })

    except Exception as e:
        return jsonify({
            "message": "MySQL 연결 실패",
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
