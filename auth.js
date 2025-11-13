document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm"); // Thêm mới

  // *** LOGIC ẨN/HIỆN MẬT KHẨU (CHUNG) ***
  // Sửa: Hàm này để tái sử dụng cho nhiều trường mật khẩu
  function setupPasswordToggle(inputId, toggleId) {
    const passwordInput = document.getElementById(inputId);
    const togglePassword = document.getElementById(toggleId);

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener("click", () => {
        const type =
          passwordInput.getAttribute("type") === "password"
            ? "text"
            : "password";
        passwordInput.setAttribute("type", type);

        if (type === "password") {
          togglePassword.classList.remove("fa-eye-slash");
          togglePassword.classList.add("fa-eye");
        } else {
          togglePassword.classList.remove("fa-eye");
          togglePassword.classList.add("fa-eye-slash");
        }
      });
    }
  }

  // Áp dụng cho các form
  setupPasswordToggle("password", "togglePassword");
  // Thêm mới: Áp dụng cho form quên mật khẩu (nếu có)
  setupPasswordToggle("confirmPassword", "toggleConfirmPassword");
  // *** KẾT THÚC LOGIC ẨN/HIỆN MẬT KHẨU ***

  // Lắng nghe sự kiện submit của form đăng ký
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      if (password.length < 8) {
        showError("Mật khẩu phải có tối thiểu 8 ký tự.");
        return;
      }

      const users = JSON.parse(localStorage.getItem("healthUsers") || "[]");
      const existingUser = users.find((user) => user.email === email);

      if (existingUser) {
        showError("Email này đã được sử dụng.");
        return;
      }

      const newUser = { name, email, password };
      users.push(newUser);
      localStorage.setItem("healthUsers", JSON.stringify(users));

      window.location.href = "login.html";
    });
  }

  // Lắng nghe sự kiện submit của form đăng nhập
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const users = JSON.parse(localStorage.getItem("healthUsers") || "[]");

      const user = users.find(
        (u) => u.email === email && u.password === password
      );

      if (user) {
        localStorage.setItem(
          "healthSession",
          JSON.stringify({ name: user.name, email: user.email })
        );
        window.location.href = "index.html";
      } else {
        showError("Email hoặc mật khẩu không đúng.");
      }
    });
  }

  // *** THÊM MỚI: LOGIC QUÊN MẬT KHẨU ***
  let emailToReset = null; // Biến tạm để lưu email

  if (forgotForm) {
    const step1 = document.getElementById("step1-group");
    const step2 = document.getElementById("step2-group");
    const submitBtn = document.getElementById("submitButton");
    const formTitle = document.getElementById("formTitle");
    const formSubtitle = document.getElementById("formSubtitle");
    const formContainer = document.getElementById("formContainer");

    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const step = forgotForm.dataset.step;
      const users = JSON.parse(localStorage.getItem("healthUsers") || "[]");

      if (step === "1") {
        // --- Bước 1: Kiểm tra Email ---
        const email = document.getElementById("email").value;
        const user = users.find((u) => u.email === email);

        if (user) {
          emailToReset = email; // Lưu lại email
          // Chuyển sang Bước 2
          step1.classList.add("hidden");
          step2.classList.remove("hidden");
          forgotForm.dataset.step = "2";
          submitBtn.innerHTML =
            '<i class="fa-solid fa-check"></i> Đặt lại mật khẩu';
          formTitle.textContent = "Tạo mật khẩu mới";
          formSubtitle.textContent = "Vui lòng nhập mật khẩu mới của bạn.";
          showError("", true); // Ẩn lỗi (nếu có)
        } else {
          showError("Email không tồn tại trong hệ thống.");
        }
      } else if (step === "2") {
        // --- Bước 2: Đặt lại Mật khẩu ---
        const newPassword = document.getElementById("password").value;
        const confirmPassword =
          document.getElementById("confirmPassword").value;

        if (newPassword.length < 8) {
          showError("Mật khẩu phải có tối thiểu 8 ký tự.");
          return;
        }
        if (newPassword !== confirmPassword) {
          showError("Mật khẩu xác nhận không khớp.");
          return;
        }

        // Tìm user và cập nhật mật khẩu
        const userIndex = users.findIndex((u) => u.email === emailToReset);
        if (userIndex !== -1) {
          users[userIndex].password = newPassword; // Cập nhật mật khẩu
          localStorage.setItem("healthUsers", JSON.stringify(users)); // Lưu lại

          // Hiển thị thông báo thành công
          formContainer.innerHTML = `
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-20 h-20 mb-5 rounded-2xl medical-icon shadow-lg">
                <i class="fa-solid fa-check text-4xl text-white"></i>
              </div>
              <h2 class="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent mb-2">
                Thành công!
              </h2>
              <p class="text-sm text-slate-600 mb-6">
                Mật khẩu của bạn đã được đặt lại.
              </p>
              <a href="login.html" class="gradient-button flex w-full items-center justify-center gap-2 rounded-xl p-3.5 text-sm font-semibold text-white shadow-lg"
                 style="text-decoration: none;"> <i class="fa-solid fa-right-to-bracket"></i>
                Về trang đăng nhập
              </a>
            </div>
          `;
        } else {
          // Trường hợp này hiếm khi xảy ra
          showError("Đã xảy ra lỗi. Vui lòng thử lại từ Bước 1.");
          // Reset về Bước 1
          step1.classList.remove("hidden");
          step2.classList.add("hidden");
          forgotForm.dataset.step = "1";
          submitBtn.innerHTML =
            '<i class="fa-solid fa-arrow-right"></i> Tiếp tục';
          formTitle.textContent = "Quên mật khẩu";
          formSubtitle.textContent = "Nhập email để đặt lại mật khẩu của bạn.";
          emailToReset = null;
        }
      }
    });
  }
  // *** KẾT THÚC LOGIC QUÊN MẬT KHẨU ***

  // Hàm hiển thị lỗi (Sửa: Thêm tham số 'hide')
  function showError(message, hide = false) {
    const errorEl = document.getElementById("errorMsg");
    const errorText = document.getElementById("errorText");
    if (errorEl && errorText) {
      if (hide) {
        errorEl.classList.add("hidden"); // Chỉ ẩn đi
        errorText.textContent = "";
      } else {
        errorText.textContent = message; // Hiển thị lỗi
        errorEl.classList.remove("hidden");
      }
    }
  }
});
