import RPi.GPIO as GPIO
import time
import artwork


# 버튼이 연결된 GPIO 핀 번호
BUTTON_PIN = 17

# GPIO 버튼 입력 감지 설정
def setup_button():
    GPIO.setmode(GPIO.BCM)

    # 내부 풀업 저항 활성화
    GPIO.setup(
        BUTTON_PIN,
        GPIO.IN,
        pull_up_down=GPIO.PUD_UP
    )

# 버튼이 눌렸는지 확인하는 함수
def is_button_pressed():
    return GPIO.input(BUTTON_PIN) == GPIO.LOW

# 물리 버튼 입력 감지 및 축하 이벤트 실행
if __name__ == "__main__":
    setup_button()

    print("버튼 입력 감지 시작")

    try:
        while True:
            if is_button_pressed():
                print("물리 버튼이 눌렸습니다!")

                # 축하 이벤트 실행
                result = artwork.execute_celebration("physical")
                print(result)

                # 버튼을 뗄 때까지 대기
                while is_button_pressed():
                    time.sleep(0.05)

                time.sleep(0.3)

    except KeyboardInterrupt:
        print("프로그램 종료")

    finally:
        GPIO.cleanup()
