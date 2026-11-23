import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

#db불러오기
def get_db_connection():
    db = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
    )

    return db
#메시지저장
def insert_message(name, content):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        sql = """
            INSERT INTO messages (name, content)
            VALUES (%s, %s)
        """
        cursor.execute(sql, (name, content))
        db.commit()
        return True

    finally:
        cursor.close()
        db.close()

#메시지불러오기
def get_messages():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        sql = """
            SELECT id, name, content, created_at
            FROM messages
            ORDER BY created_at DESC, id DESC
        """
        cursor.execute(sql)
        return cursor.fetchall()

    finally:
        cursor.close()
        db.close()

#메시지 삭제
def delete_message(message_id):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        sql = "DELETE FROM messages WHERE id = %s"
        cursor.execute(sql, (message_id,))
        db.commit()

        return cursor.rowcount > 0

    finally:
        cursor.close()
        db.close()

#메시지 수정
def update_message(message_id, name, content):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        sql = """
            UPDATE messages
            SET name = %s, content = %s
            WHERE id = %s
        """

        cursor.execute(sql, (name, content, message_id))
        db.commit()

        return cursor.rowcount > 0

    finally:
        cursor.close()
        db.close()

#아트워크저장
def insert_artwork(artwork_data):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        sql = """
            INSERT INTO artworks (artwork_data)
            VALUES (%s)
        """

        cursor.execute(sql, (artwork_data,))
        db.commit()

        return cursor.lastrowid

    finally:
        cursor.close()
        db.close()

#작품데이터조회
def get_artworks():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        sql = """
            SELECT id, artwork_data, created_at
            FROM artworks
            ORDER BY created_at DESC, id DESC
        """

        cursor.execute(sql)
        return cursor.fetchall()

    finally:
        cursor.close()
        db.close()

# 버튼 실행 이벤트를 데이터베이스에 기록하는 함수
def insert_trigger_event(source, status, artwork_id=None):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        # 버튼 실행 정보 저장
        sql = """
            INSERT INTO trigger_events (source, status, artwork_id)
            VALUES (%s, %s, %s)
        """

        cursor.execute(sql, (source, status, artwork_id))
        db.commit()

        # 저장된 이벤트의 ID 반환
        return cursor.lastrowid

    finally:
        cursor.close()
        db.close()

# 저장된 버튼 이벤트 목록을 조회하는 함수
def get_trigger_events():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        # 최신 이벤트부터 조회
        sql = """
            SELECT id, source, status, triggered_at, artwork_id
            FROM trigger_events
            ORDER BY triggered_at DESC, id DESC
        """

        cursor.execute(sql)
        return cursor.fetchall()

    finally:
        cursor.close()
        db.close()
