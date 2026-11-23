from flask import Flask, request, render_template, jsonify
import database

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")


# 축하 메시지 등록
@app.route("/api/messages", methods=["POST"])
def create_message():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"message": "요청 데이터가 없습니다."}), 400

        name = data.get("name", "").strip()
        content = data.get("content", "").strip()

        if not name or not content:
            return jsonify({"message": "이름과 메시지를 입력해 주세요."}), 400

        if len(name) > 50:
            return jsonify({"message": "이름은 50자 이내로 입력해 주세요."}), 400

        database.insert_message(name, content)

        return jsonify({
            "message": "축하 메시지가 저장되었습니다."
        }), 201

    except Exception as e:
        return jsonify({
            "message": "메시지 저장 실패",
            "error": str(e)
        }), 500


# 축하 메시지 조회
@app.route("/api/messages", methods=["GET"])
def read_messages():
    try:
        messages = database.get_messages()

        for message in messages:
            message["created_at"] = message["created_at"].strftime(
                "%Y-%m-%d %H:%M:%S"
            )

        return jsonify({
            "message": "메시지 조회 성공",
            "messages": messages
        })

    except Exception as e:
        return jsonify({
            "message": "메시지 조회 실패",
            "error": str(e)
        }), 500

@app.route("/api/messages/<int:message_id>", methods=["DELETE"])
def delete_message(message_id):
    try:
        result = database.delete_message(message_id)

        if not result:
            return jsonify({
                "message": "해당 메시지를 찾을 수 없습니다."
            }), 404

        return jsonify({
            "message": "메시지가 삭제되었습니다."
        })

    except Exception as e:
        return jsonify({
            "message": "메시지 삭제 실패",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
