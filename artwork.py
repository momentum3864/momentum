import json
import database

# 축하 메시지 데이터가 올바른지 검증하는 함수
def validate_messages(messages):

    # 메시지 데이터가 리스트인지 확인
    if not isinstance(messages, list):
        raise ValueError("메시지 데이터 형식이 올바르지 않습니다.")

    # 각 메시지 검증
    for message in messages:

        # 메시지가 딕셔너리인지 확인
        if not isinstance(message, dict):
            raise ValueError("메시지 형식이 올바르지 않습니다.")

        # 필수 항목 확인
        required_fields = ["id", "name", "content"]

        for field in required_fields:
            if field not in message:
                raise ValueError(f"메시지에 {field} 항목이 없습니다.")

        # 작성자와 내용 확인
        if not str(message["name"]).strip():
            raise ValueError("작성자 이름이 비어 있습니다.")

        if not str(message["content"]).strip():
            raise ValueError("메시지 내용이 비어 있습니다.")

    return True

# 축하 메시지를 작품 데이터로 생성하는 함수
def create_artwork():
    messages = database.get_messages()

             # 메시지 데이터 검증
    validate_messages(messages)

    artwork_data = {
        "message_count": len(messages),
        "messages": messages
    }

    return artwork_data


# 축하 이벤트를 실행하는 공통 함수
def execute_celebration(source):
    # 실행 잠금 획득
    db = database.acquire_celebration_lock()

    # 다른 축하 이벤트가 실행 중인 경우
    if db is None:
        return {
            "success": False,
            "message": "이미 축하 이벤트가 실행 중입니다."
        }

    try:
        # 작품 데이터 생성
        artwork = create_artwork()

        # 작품 데이터를 JSON 문자열로 변환
        artwork_json = json.dumps(
            artwork,
            ensure_ascii=False,
            default=str
        )

        # 작품 데이터 저장
        artwork_id = database.insert_artwork(artwork_json)

        # 버튼 실행 이벤트 기록
        event_id = database.insert_trigger_event(
            source,
            "success",
            artwork_id
        )

        return {
            "success": True,
            "event_id": event_id,
            "artwork_id": artwork_id,
            "message_count": artwork["message_count"]
        }

    except Exception as e:
        # 축하 이벤트 실패 기록
        try:
            database.insert_trigger_event(
                source,
                "failed",
                None
            )
        except Exception as log_error:
            print("실패 이벤트 기록 오류:", log_error)

        return {
            "success": False,
            "error": str(e)
        }

    finally:
        # 실행 잠금 해제
        database.release_celebration_lock(db)
