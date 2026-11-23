import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    db = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
    )

    return db

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
