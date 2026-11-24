/*
 * MOMENTUM 공통 스크립트
 *
 * initGuestPage   : 하객 메시지 작성 페이지
 * initDisplayPage : 행사장 디스플레이 페이지
 * initAdminPage   : 관리자 페이지
 */

(function () {
  const M = (window.MOMENTUM = window.MOMENTUM || {});

  // =====================================================
  // API
  // =====================================================

  // Flask 서버에 요청을 보내고 응답을 처리하는 함수
  async function request(method, url, body) {
    const options = {
      method,
      headers: body
        ? { "Content-Type": "application/json" }
        : {},
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `요청 실패 (${response.status})`
      );
    }

    return data;
  }

  const api = {

    // 전체 메시지 조회
    getMessages: () =>
      request("GET", "/api/messages").then(
        (data) => data.messages || []
      ),

    // 메시지 등록
    createMessage: (name, content) =>
      request("POST", "/api/messages", {
        name,
        content,
      }),

    // 메시지 수정
    updateMessage: (id, name, content) =>
      request("PUT", `/api/messages/${id}`, {
        name,
        content,
      }),

    // 메시지 삭제
    deleteMessage: (id) =>
      request("DELETE", `/api/messages/${id}`),

    // 전체 작품 조회
    getArtworks: () =>
      request("GET", "/api/artworks").then(
        (data) => data.artworks || []
      ),

    // 전체 버튼 실행 기록 조회
    getTriggers: () =>
      request("GET", "/api/triggers").then(
        (data) => data.events || []
      ),

    /*
     * 축하 이벤트 실행
     *
     * 실제 작품 생성과 실행 기록 저장은
     * Flask의 POST /api/triggers가 담당한다.
     *
     * artwork.py의 execute_celebration(source)가
     * 내부에서 작품 저장과 실행 기록 저장을 처리한다.
     */
    celebrate: (source = "web") =>
      request("POST", "/api/triggers", {
        source,
      }),
  };

  M.api = api;

  // =====================================================
  // 공통 유틸리티
  // =====================================================

  // 데이터의 ID를 가져오는 함수
  const idOf = (item) => Number(item.id);

  // ID를 기준으로 오름차순 정렬하는 함수
  const byId = (a, b) => idOf(a) - idOf(b);

  // 작품에 저장된 메시지 목록을 가져오는 함수
  function artworkMessages(artwork) {
    return Array.isArray(artwork.messages)
      ? artwork.messages.slice()
      : [];
  }

  // 작품 ID를 이용해 동일한 난수 시드를 생성하는 함수
  function seedOf(artworkId) {
    return (Number(artworkId) * 2654435761) >>> 0;
  }

  // DB에 저장된 작품 JSON을 객체로 변환하는 함수
  function parseArtwork(row) {
    let data = row.artwork_data;

    for (
      let i = 0;
      i < 3 && typeof data === "string";
      i++
    ) {
      try {
        data = JSON.parse(data);
      } catch (error) {
        return {};
      }
    }

    return data && typeof data === "object"
      ? data
      : {};
  }

  // 안전하게 HTML 요소를 생성하는 함수
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") {
        node.className = value;
      } else if (key.startsWith("on")) {
        node.addEventListener(
          key.slice(2),
          value
        );
      } else if (
        value !== undefined &&
        value !== null
      ) {
        node.setAttribute(key, value);
      }
    }

    for (const child of children) {
      if (child === null || child === undefined) {
        continue;
      }

      node.append(
        child instanceof Node
          ? child
          : document.createTextNode(String(child))
      );
    }

    return node;
  }

  // 지정한 시간만큼 기다리는 함수
  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));


  // =====================================================
  // 1. 하객 페이지
  // =====================================================

  // 하객 메시지 작성 페이지를 초기화하는 함수
  M.initGuestPage = function () {
    const form = document.getElementById("message-form");
    const nameInput = document.getElementById("name");
    const contentInput = document.getElementById("content");
    const count = document.getElementById("content-count");
    const error = document.getElementById("form-error");
    const submit = document.getElementById("submit-btn");
    const sent = document.getElementById("sent");
    const writeAgain = document.getElementById("write-again");

    if (
      !form ||
      !nameInput ||
      !contentInput ||
      !count ||
      !error ||
      !submit ||
      !sent ||
      !writeAgain
    ) {
      console.error("하객 페이지 요소를 찾을 수 없습니다.");
      return;
    }

    // 이전에 입력한 이름 불러오기
    try {
      nameInput.value =
        localStorage.getItem("momentum:name") || "";
    } catch (storageError) {
      nameInput.value = "";
    }

    // 메시지 글자 수 표시
    contentInput.addEventListener("input", () => {
      count.textContent = contentInput.value.length;
    });

    // 오류 메시지를 표시하는 함수
    function showError(message) {
      error.textContent = message;
      error.hidden = !message;
    }

    // 메시지 등록 처리
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = nameInput.value.trim();
      const content = contentInput.value.trim();

      if (!name) {
        showError("이름을 입력해 주세요.");
        nameInput.focus();
        return;
      }

      if (!content) {
        showError("축하 메시지를 입력해 주세요.");
        contentInput.focus();
        return;
      }

      showError("");

      submit.disabled = true;
      submit.textContent = "보내는 중…";

      try {
        // Flask API에 메시지 등록
        await api.createMessage(name, content);

        // 이름 기억하기
        try {
          localStorage.setItem("momentum:name", name);
        } catch (storageError) {
          // 저장이 안 되어도 메시지 등록은 유지
        }

        contentInput.value = "";
        count.textContent = "0";

        form.hidden = true;
        sent.hidden = false;

      } catch (error) {
        showError(error.message);

      } finally {
        submit.disabled = false;
        submit.textContent = "메시지 보내기";
      }
    });

    // 다시 작성하기
    writeAgain.addEventListener("click", () => {
      sent.hidden = true;
      form.hidden = false;
      contentInput.focus();
    });
  };


  // =====================================================
  // 2. 디스플레이 페이지
  // =====================================================

  // 행사장 디스플레이 페이지를 초기화하는 함수
  M.initDisplayPage = function () {

    const params = new URLSearchParams(location.search);

    const artworkParam = params.get("artwork");

    const shape =
      params.get("shape") === "flower"
        ? "flower"
        : "tree";

    const canvas = document.getElementById("stage");

    if (!canvas || !M.Stage) {
      console.error("캔버스 또는 애니메이션 Stage를 찾을 수 없습니다.");
      return;
    }

    const stage = new M.Stage(canvas);

    stage.start();

    const idleOverlay = document.getElementById("idle-overlay");
    const countEl = document.getElementById("message-count");
    const caption = document.getElementById("caption");
    const captionContent = document.getElementById("caption-content");
    const captionName = document.getElementById("caption-name");
    const doneTitle = document.getElementById("done-title");
    const doneText = document.getElementById("done-text");
    const statusEl = document.getElementById("status");

    let running = false;
    let captionTimer = null;

    // 상태 메시지를 표시하는 함수
    function setStatus(message, duration = 4000) {
      statusEl.textContent = message;

      if (duration > 0) {
        setTimeout(() => {
          if (statusEl.textContent === message) {
            statusEl.textContent = "";
          }
        }, duration);
      }
    }

    // 완성 후 메시지를 순서대로 표시하는 함수
    function startCaptions(messages) {
      clearInterval(captionTimer);

      if (!messages.length) {
        return;
      }

      let index = -1;

      function showNext() {
        index = (index + 1) % messages.length;

        caption.classList.remove("show");

        setTimeout(() => {
          const message = messages[index];

          captionContent.textContent =
            message.content || "";

          captionName.textContent =
            `— ${message.name || "익명"}`;

          stage.setHighlight(index);

          caption.hidden = false;
          caption.classList.add("show");

        }, 400);
      }

      showNext();

      captionTimer = setInterval(
        showNext,
        4500
      );
    }

    // 새로운 작품을 재생하기 전 화면을 초기화하는 함수
    function resetForPlay() {
      clearInterval(captionTimer);

      caption.hidden = true;
      caption.classList.remove("show");

      doneTitle.hidden = true;

      idleOverlay.classList.add("hide");
    }

    // 작품 모양의 이름을 반환하는 함수
    function shapeName(value) {
      return value === "flower" ? "꽃" : "나무";
    }

    // 저장된 작품을 실제 캔버스에 재생하는 함수
    function playArtwork(row, skipBurst) {

      const artwork = parseArtwork(row);
      const messages = artworkMessages(artwork);

      const artworkShape = artwork.shape || shape;

      if (!messages.length) {
        setStatus("작품에 담긴 메시지가 없어요.", 0);
        return false;
      }

      resetForPlay();

      stage.play(
        {
          shape: artworkShape,
          seed: seedOf(idOf(row)),
        },
        messages,
        {
          skipBurst,

          onComplete: () => {

            doneText.textContent =
              `${messages.length}개의 축하로 피어난 ${shapeName(artworkShape)}`;

            if (skipBurst && row.created_at) {
              doneText.textContent +=
                ` · ${row.created_at}`;
            }

            doneTitle.hidden = false;

            startCaptions(messages);

            running = false;
          },
        }
      );

      return true;
    }


    // -----------------------------------------------------
    // 저장된 작품 다시 보기
    // -----------------------------------------------------

    // 저장된 작품을 조회하고 재생하는 함수
    async function replay(which) {

      idleOverlay.hidden = true;

      try {
        const artworks = await api.getArtworks();

        if (!artworks.length) {
          setStatus("아직 완성된 작품이 없어요.", 0);
          return;
        }

        const sorted = artworks.slice().sort(byId);

        const row =
          which === "latest"
            ? sorted[sorted.length - 1]
            : artworks.find(
                (item) =>
                  String(idOf(item)) === String(which)
              );

        if (!row) {
          setStatus("작품을 찾을 수 없어요.", 0);
          return;
        }

        playArtwork(row, true);

      } catch (error) {
        setStatus(error.message, 0);
      }
    }

    // URL에 artwork가 있으면 다시 보기 모드 실행
    if (artworkParam) {
      replay(artworkParam);
      return;
    }


    // -----------------------------------------------------
    // 실시간 디스플레이 모드
    // -----------------------------------------------------

    let lastTriggerId = null;

    // 현재 메시지 개수와 대기 화면을 갱신하는 함수
    async function refreshMessages() {

      if (running) {
        return;
      }

      try {
        const messages = await api.getMessages();

        countEl.textContent = messages.length;

        stage.setIdleMessages(messages);

      } catch (error) {
        setStatus(
          "메시지를 불러오지 못했어요: " + error.message
        );
      }
    }

    // 새로운 버튼 실행 기록을 확인하는 함수
    async function pollTriggers() {

      try {
        const events = await api.getTriggers();

        const maxId = events.reduce(
          (max, event) =>
            Math.max(max, idOf(event) || 0),
          0
        );

        // 처음 접속했을 때 기존 기록은 재생하지 않음
        if (lastTriggerId === null) {
          lastTriggerId = maxId;
          return;
        }

        // 마지막 확인 이후 새로 발생한 성공 이벤트
        const freshEvents = events
          .filter(
            (event) =>
              idOf(event) > lastTriggerId &&
              event.status === "success" &&
              event.artwork_id
          )
          .sort(byId);

        lastTriggerId = Math.max(
          lastTriggerId,
          maxId
        );

        // 새 이벤트가 있으면 가장 최근 작품 재생
        if (freshEvents.length && !running) {
          run(freshEvents[freshEvents.length - 1]);
        }

      } catch (error) {
        // 네트워크 오류가 발생하면 다음 확인 때 다시 시도
      }
    }

    // 버튼 실행 기록에 해당하는 작품을 찾아 재생하는 함수
    async function run(event) {

      if (running) {
        return;
      }

      running = true;

      try {
        const artworks = await api.getArtworks();

        const row = artworks.find(
          (artwork) =>
            String(idOf(artwork)) ===
            String(event.artwork_id)
        );

        if (!row) {
          throw new Error(
            `작품 #${event.artwork_id}을(를) 찾을 수 없어요.`
          );
        }

        const success = playArtwork(row, false);

        if (!success) {
          running = false;
          return;
        }

        setStatus(
          `${event.source === "physical" ? "물리 버튼" : "웹 버튼"} · 작품 #${event.artwork_id}`,
          0
        );

      } catch (error) {
        setStatus("실행 실패: " + error.message);
        running = false;
      }
    }

    // 키보드로 축하 이벤트 실행
    window.addEventListener("keydown", async (event) => {

      if (
        (event.code === "Space" || event.code === "Enter") &&
        !running
      ) {
        event.preventDefault();

        try {
          await api.celebrate("web");

          // 실행 기록은 다음 폴링에서 감지
          await pollTriggers();

        } catch (error) {
          setStatus(error.message);
        }
      }
    });

    // 첫 화면 데이터 불러오기
    refreshMessages();
    pollTriggers();

    // 메시지 5초마다 갱신
    setInterval(refreshMessages, 5000);

    // 실행 기록 1.5초마다 확인
    setInterval(pollTriggers, 1500);
  };


  // =====================================================
  // 3. 관리자 페이지
  // =====================================================

  // 관리자 페이지를 초기화하는 함수
  M.initAdminPage = function () {

    const msgRows = document.getElementById("message-rows");
    const artList = document.getElementById("artwork-list");
    const trgRows = document.getElementById("trigger-rows");

    let editing = false;

    // 빈 테이블 행을 생성하는 함수
    function emptyRow(columns, message) {
      return el(
        "tr",
        {},
        el(
          "td",
          {
            colspan: columns,
            class: "empty",
          },
          message
        )
      );
    }

    // 메시지 목록을 화면에 출력하는 함수
    function renderMessages(messages) {

      document.getElementById("stat-messages").textContent =
        messages.length;

      msgRows.replaceChildren();

      if (!messages.length) {
        msgRows.append(
          emptyRow(5, "아직 메시지가 없어요.")
        );
        return;
      }

      messages
        .slice()
        .sort(byId)
        .reverse()
        .forEach((message) => {

          const id = idOf(message);

          const row = el(
            "tr",
            {},

            el("td", { class: "num" }, id),

            el("td", { class: "name" }, message.name),

            el("td", { class: "content" }, message.content),

            el("td", { class: "time" }, message.created_at || "–"),

            el(
              "td",
              { class: "actions" },

              el(
                "button",
                {
                  class: "btn btn-ghost btn-sm",
                  onclick: () => startEdit(row, message),
                },
                "수정"
              ),

              el(
                "button",
                {
                  class: "btn btn-danger btn-sm",
                  onclick: () => remove(message),
                },
                "삭제"
              )
            )
          );

          msgRows.append(row);
        });
    }

    // 메시지 수정 입력 화면을 표시하는 함수
    function startEdit(row, message) {

      if (editing) {
        return;
      }

      editing = true;

      const nameInput = el("input", {
        class: "input",
        maxlength: 50,
        value: message.name || "",
      });

      const contentInput = el("textarea", {
        class: "input",
        rows: 2,
        maxlength: 200,
      });

      contentInput.value = message.content || "";

      // 수정 내용을 저장하는 함수
      async function save() {

        const name = nameInput.value.trim();
        const content = contentInput.value.trim();

        if (!name || !content) {
          alert("이름과 메시지를 모두 입력해 주세요.");
          return;
        }

        try {
          await api.updateMessage(
            idOf(message),
            name,
            content
          );

          editing = false;

          await loadAll();

        } catch (error) {
          alert(error.message);
        }
      }

      // 수정 취소 함수
      function cancel() {
        editing = false;
        loadAll();
      }

      row.replaceChildren(

        el("td", { class: "num" }, idOf(message)),

        el("td", {}, nameInput),

        el("td", {}, contentInput),

        el("td", { class: "time" }, message.created_at || "–"),

        el(
          "td",
          { class: "actions" },

          el(
            "button",
            {
              class: "btn btn-primary btn-sm",
              onclick: save,
            },
            "저장"
          ),

          el(
            "button",
            {
              class: "btn btn-ghost btn-sm",
              onclick: cancel,
            },
            "취소"
          )
        )
      );

      nameInput.focus();
    }

    // 메시지를 삭제하는 함수
    async function remove(message) {

      const confirmed = confirm(
        `"${message.name}"님의 메시지를 삭제할까요?`
      );

      if (!confirmed) {
        return;
      }

      try {
        await api.deleteMessage(idOf(message));

        await loadAll();

      } catch (error) {
        alert(error.message);
      }
    }

    // 작품 목록을 화면에 출력하는 함수
    function renderArtworks(artworks) {

      document.getElementById("stat-artworks").textContent =
        artworks.length;

      artList.replaceChildren();

      if (!artworks.length) {
        artList.append(
          el(
            "li",
            { class: "empty" },
            "아직 완성된 작품이 없어요."
          )
        );
        return;
      }

      artworks
        .slice()
        .sort(byId)
        .reverse()
        .forEach((artwork) => {

          const data = parseArtwork(artwork);

          const id = idOf(artwork);

          const messageCount =
            data.message_count ??
            (Array.isArray(data.messages)
              ? data.messages.length
              : 0);

          const shape =
            data.shape === "flower"
              ? "꽃"
              : "나무";

          artList.append(

            el(
              "li",
              {},

              el(
                "span",
                { class: "art-id" },
                `#${id}`
              ),

              el(
                "span",
                { class: "art-meta" },

                `${shape} · 메시지 ${messageCount}개`,

                el("br"),

                el(
                  "small",
                  {},
                  artwork.created_at || ""
                )
              ),

              el(
                "a",
                {
                  class: "btn btn-ghost btn-sm",
                  href: `${window.DISPLAY_URL || "/display"}?artwork=${id}`,
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
                "보기"
              )
            )
          );
        });
    }

    // 버튼 실행 기록을 화면에 출력하는 함수
    function renderTriggers(events) {

      document.getElementById("stat-triggers").textContent =
        events.length;

      trgRows.replaceChildren();

      if (!events.length) {
        trgRows.append(
          emptyRow(5, "아직 실행 기록이 없어요.")
        );
        return;
      }

      events
        .slice()
        .sort(byId)
        .reverse()
        .slice(0, 50)
        .forEach((event) => {

          trgRows.append(

            el(
              "tr",
              {},

              el("td", { class: "num" }, idOf(event)),

              el(
                "td",
                {},
                event.source === "physical"
                  ? "물리 버튼"
                  : "웹 버튼"
              ),

              el(
                "td",
                {},

                el(
                  "span",
                  {
                    class: `badge badge-${event.status}`,
                  },
                  event.status === "success"
                    ? "성공"
                    : "실패"
                )
              ),

              el(
                "td",
                {},
                event.artwork_id
                  ? `#${event.artwork_id}`
                  : "–"
              ),

              el(
                "td",
                { class: "time" },
                event.triggered_at || "–"
              )
            )
          );
        });
    }

    // 메시지, 작품, 실행 기록을 한 번에 새로 불러오는 함수
    async function loadAll() {

      if (editing) {
        return;
      }

      const results = await Promise.allSettled([
        api.getMessages(),
        api.getArtworks(),
        api.getTriggers(),
      ]);

      const [messages, artworks, triggers] = results;

      if (messages.status === "fulfilled") {
        renderMessages(messages.value);
      } else {
        msgRows.replaceChildren(
          emptyRow(
            5,
            "불러오기 실패: " + messages.reason.message
          )
        );
      }

      if (artworks.status === "fulfilled") {
        renderArtworks(artworks.value);
      } else {
        artList.replaceChildren(
          el(
            "li",
            { class: "empty" },
            "불러오기 실패: " + artworks.reason.message
          )
        );
      }

      if (triggers.status === "fulfilled") {
        renderTriggers(triggers.value);
      } else {
        trgRows.replaceChildren(
          emptyRow(
            5,
            "불러오기 실패: " + triggers.reason.message
          )
        );
      }
    }

    // 웹 버튼으로 축하 이벤트를 실행하는 함수
    const triggerBtn = document.getElementById("web-trigger");
    const triggerResult = document.getElementById("trigger-result");

    triggerBtn.addEventListener("click", async () => {

      triggerBtn.disabled = true;
      triggerResult.textContent = "축하 작품을 생성하고 있어요…";

      try {

        // 백엔드에서 작품 생성과 실행 기록 저장
        const result = await api.celebrate("web");

        triggerResult.textContent =
          `작품 #${result.artwork_id}이(가) 만들어졌어요. ` +
          `(메시지 ${result.message_count}개) 디스플레이를 확인하세요.`;

        await loadAll();

      } catch (error) {

        triggerResult.textContent =
          "실패: " + error.message;

      } finally {

        await sleep(1500);

        triggerBtn.disabled = false;
      }
    });

    // 새로고침 버튼 연결
    document.querySelectorAll("[data-refresh]").forEach(
      (button) => {
        button.addEventListener("click", loadAll);
      }
    );

    // 최초 데이터 불러오기
    loadAll();

    // 10초마다 관리자 데이터 갱신
    setInterval(loadAll, 10000);
  };

})();
