from flask import Flask, request, render_template, jsonify
import database
import artwork
import json

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

@app.route("/api/messages/<int:message_id>", methods=["PUT"])
def update_message(message_id):
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

        result = database.update_message(message_id, name, content)

        if not result:
            return jsonify({"message": "해당 메시지를 찾을 수 없습니다."}), 404

        return jsonify({"message": "메시지가 수정되었습니다."})

    except Exception as e:
        return jsonify({"message": "메시지 수정 실패", "error": str(e)}), 500

# 작품 데이터를 데이터베이스에 저장하는 API
@app.route("/api/artworks", methods=["POST"])
def create_artwork():
    try:
        # 클라이언트가 보낸 JSON 데이터 가져오기
        data = request.get_json()

        # 작품 데이터가 전달되었는지 확인
        if not data or "artwork_data" not in data:
            return jsonify({"message": "작품 데이터가 없습니다."}), 400

        # JSON에서 작품 데이터 추출
        artwork_data = data["artwork_data"]

        # 데이터베이스에 작품 저장하고 ID 반환
        artwork_id = database.insert_artwork(artwork_data)

        # 저장 성공 및 작품 ID 반환
        return jsonify({
            "message": "작품이 저장되었습니다.",
            "artwork_id": artwork_id
        }), 201

    except Exception as e:
        # 오류 발생 시 실패 메시지 반환
        return jsonify({
            "message": "작품 저장 실패",
            "error": str(e)
        }), 500

# 저장된 작품 목록을 조회하는 API
@app.route("/api/artworks", methods=["GET"])
def read_artworks():
    try:
        # 데이터베이스에서 작품 목록 가져오기
        artworks = database.get_artworks()

        # 날짜 데이터를 문자열로 변환
        for artwork in artworks:
            artwork["created_at"] = artwork["created_at"].strftime("%Y-%m-%d %H:%M:%S")

        # 조회 성공 및 작품 목록 반환
        return jsonify({
            "message": "작품 조회 성공",
            "artworks": artworks
        })

    except Exception as e:
        # 오류 발생 시 실패 메시지 반환
        return jsonify({
            "message": "작품 조회 실패",
            "error": str(e)
        }), 500

# 가장 최근 작품 조회
@app.route("/api/artworks/latest", methods=["GET"])
def read_latest_artwork():
    try:
        artworks = database.get_artworks()

        if not artworks:
            return jsonify({
                "message": "저장된 작품이 없습니다."
            }), 404

        latest = artworks[0]

        # JSON 문자열을 파이썬 데이터로 변환
        artwork_data = json.loads(latest["artwork_data"])

        return jsonify({
            "id": latest["id"],
            "created_at": str(latest["created_at"]),
            "artwork_data": artwork_data
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

# 축하 이벤트 실행
@app.route("/api/triggers", methods=["POST"])
def create_trigger():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"message": "요청 데이터가 없습니다."}), 400

        source = data.get("source")

        if source not in ["physical", "web"]:
            return jsonify({"message": "잘못된 실행 방식입니다."}), 400

                # 축하 이벤트 실행
        result = artwork.execute_celebration(source)

        # 이미 다른 축하 이벤트가 실행 중인 경우
        if not result["success"] and "message" in result:
            return jsonify(result), 409

        # 그 외 실행 오류
        if not result["success"]:
            return jsonify(result), 500

        # 실행 성공
        return jsonify(result), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500

# 저장된 버튼 이벤트 목록을 조회하는 API
@app.route("/api/triggers", methods=["GET"])
def read_trigger_events():
    try:
        # 데이터베이스에서 버튼 이벤트 목록 가져오기
        events = database.get_trigger_events()

        # 날짜 데이터를 문자열로 변환
        for event in events:
            event["triggered_at"] = event["triggered_at"].strftime(
                "%Y-%m-%d %H:%M:%S"
            )

        # 조회 성공 및 이벤트 목록 반환
        return jsonify({
            "message": "버튼 이벤트 조회 성공",
            "events": events
        })

    except Exception as e:
        # 오류 발생 시 실패 메시지 반환
        return jsonify({
            "message": "버튼 이벤트 조회 실패",
            "error": str(e)
        }), 500

# 가장 최근 버튼 이벤트를 조회하는 API
@app.route("/api/triggers/latest", methods=["GET"])
def read_latest_trigger():
    try:
        # 데이터베이스에서 버튼 이벤트 목록 가져오기
        events = database.get_trigger_events()

        # 저장된 이벤트가 없는 경우
        if not events:
            return jsonify({
                "message": "저장된 버튼 이벤트가 없습니다."
            }), 404

        # 가장 최근 이벤트 선택
        latest = max(events, key=lambda event: event["id"])

        # 날짜 데이터를 문자열로 변환
        latest["triggered_at"] = latest["triggered_at"].strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        return jsonify({
            "message": "최신 버튼 이벤트 조회 성공",
            "event": latest
        }), 200

    except Exception as e:
        return jsonify({
            "message": "최신 버튼 이벤트 조회 실패",
            "error": str(e)
        }), 500

@app.route("/display")
def display():
    return render_template("display.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
