/**
 * QuickNote — PHẦN 3: Màn hình Đăng nhập & Đăng ký (Stationery Checklist Cover)
 * Giao diện bìa sổ ghi chú cá nhân theo thiết kế Figma (Frame 1 & Frame 2).
 */
(function () {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Chuẩn hóa lời gọi tới QuickNoteStore.login / QuickNoteStore.register
   * Hỗ trợ cả hàm đồng bộ hoặc bất đồng bộ (Promise), throw Error hoặc trả về { error }.
   */
  async function invokeStoreAuth(fnName, args) {
    const store = window.QuickNoteStore;
    if (!store || typeof store[fnName] !== 'function') {
      throw new Error('Hệ thống lưu trữ (QuickNoteStore) chưa sẵn sàng.');
    }

    const result = await store[fnName](...args);
    if (result && typeof result === 'object') {
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : (result.error.message || 'Thao tác thất bại.'));
      }
      if (result.ok === false || result.success === false) {
        throw new Error(result.message || 'Thao tác thất bại.');
      }
    }
    return result;
  }

  /**
   * Kiểm tra dữ liệu đầu vào cho chế độ Đăng nhập
   */
  function validateLoginInput(email, password) {
    const cleanEmail = String(email || '').trim();
    const rawPassword = String(password || '');

    if (!cleanEmail) {
      return { field: 'email', message: 'Vui lòng nhập email đăng nhập.' };
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return { field: 'email', message: 'Định dạng email không hợp lệ (ví dụ: sinhvien@neu.edu.vn).' };
    }
    if (!rawPassword) {
      return { field: 'password', message: 'Vui lòng nhập mật khẩu.' };
    }
    return null;
  }

  /**
   * Kiểm tra dữ liệu đầu vào cho chế độ Đăng ký (Frame 2)
   */
  function validateRegisterInput(fullName, email, password, confirmPassword) {
    const cleanName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim();
    const rawPassword = String(password || '');
    const rawConfirm = String(confirmPassword || '');

    if (!cleanName) {
      return { field: 'fullName', message: 'Vui lòng nhập họ và tên của bạn.' };
    }
    if (cleanName.length > 80) {
      return { field: 'fullName', message: 'Họ và tên không được vượt quá 80 ký tự.' };
    }
    if (!cleanEmail) {
      return { field: 'email', message: 'Vui lòng nhập email đăng ký.' };
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return { field: 'email', message: 'Định dạng email không hợp lệ (ví dụ: sinhvien@neu.edu.vn).' };
    }
    if (!rawPassword || rawPassword.length < 6) {
      return { field: 'password', message: 'Mật khẩu phải có tối thiểu 6 ký tự.' };
    }
    if (!rawConfirm) {
      return { field: 'confirmPassword', message: 'Vui lòng nhập lại mật khẩu xác nhận.' };
    }
    if (rawPassword !== rawConfirm) {
      return { field: 'confirmPassword', message: 'Xác nhận mật khẩu không khớp với mật khẩu đã nhập.' };
    }
    return null;
  }

  /**
   * Render giao diện Đăng nhập / Đăng ký vào container
   * @param {HTMLElement} container Phần tử DOM chứa giao diện
   * @param {Function} onSuccess Callback gọi khi đăng nhập hoặc đăng ký thành công
   */
  function render(container, onSuccess) {
    if (!container) return;

    const state = {
      mode: 'login', // 'login' | 'register'
      isSubmitting: false,
      errorMessage: '',
      errorField: '',
      infoMessage: '',
      form: {
        fullName: '',
        email: 'sinhvien@neu.edu.vn',
        password: '',
        confirmPassword: ''
      }
    };

    function setMode(nextMode, prefillEmail) {
      state.mode = nextMode;
      state.isSubmitting = false;
      state.errorMessage = '';
      state.errorField = '';
      state.infoMessage = '';
      if (typeof prefillEmail === 'string') {
        state.form.email = prefillEmail;
      } else if (nextMode === 'register' && state.form.email === 'sinhvien@neu.edu.vn' && !state.form.fullName) {
        state.form.email = '';
      } else if (nextMode === 'login' && !state.form.email) {
        state.form.email = 'sinhvien@neu.edu.vn';
      }
      state.form.password = '';
      state.form.confirmPassword = '';
      draw();
    }

    function draw() {
      const isLogin = state.mode === 'login';
      const coverSubText = isLogin ? '· SỔ GHI CHÚ CÁ NHÂN ·' : '· MỞ SỔ GHI CHÚ MỚI ·';
      const submitLabel = isLogin
        ? (state.isSubmitting ? 'Đang mở sổ ghi chú...' : 'Đăng nhập vào sổ ghi chú')
        : (state.isSubmitting ? 'Đang tạo sổ ghi chú...' : 'Tạo sổ ghi chú mới');

      container.innerHTML = `
        <div class="auth-page">
          <div class="paper-sheet login-sheet" role="region" aria-label="${isLogin ? 'Bìa sổ đăng nhập QuickNote' : 'Bìa sổ đăng ký QuickNote'}">
            <header class="cover-header" style="text-align: center;">
              <div class="cover-tag">QUICKNOTE</div>
              <h1 class="cover-title">CHECKLIST</h1>
              <div class="cover-sub">${coverSubText}</div>
              <div class="terra-divider"></div>
            </header>

            <form id="qn-auth-form" class="auth-form" novalidate>
              ${
                !isLogin
                  ? `
                <div class="form-group">
                  <label for="qn-fullname">HỌ VÀ TÊN</label>
                  <input
                    id="qn-fullname"
                    name="fullName"
                    type="text"
                    class="input ${state.errorField === 'fullName' ? 'input-error' : ''}"
                    placeholder="Nguyễn Văn A"
                    value="${escapeHtml(state.form.fullName)}"
                    autocomplete="name"
                    ${state.isSubmitting ? 'disabled' : ''}
                    required
                  />
                </div>
              `
                  : ''
              }

              <div class="form-group">
                <label for="qn-email">${isLogin ? 'EMAIL ĐĂNG NHẬP' : 'EMAIL ĐĂNG KÝ'}</label>
                <input
                  id="qn-email"
                  name="email"
                  type="email"
                  class="input ${state.errorField === 'email' ? 'input-error' : ''}"
                  placeholder="sinhvien@neu.edu.vn"
                  value="${escapeHtml(state.form.email)}"
                  autocomplete="email"
                  ${state.isSubmitting ? 'disabled' : ''}
                  required
                />
              </div>

              <div class="form-group">
                <label for="qn-password">${isLogin ? 'MẬT KHẨU' : 'MẬT KHẨU (TỐI THIỂU 6 KÝ TỰ)'}</label>
                <input
                  id="qn-password"
                  name="password"
                  type="password"
                  class="input ${state.errorField === 'password' ? 'input-error' : ''}"
                  placeholder="••••••••"
                  value="${escapeHtml(state.form.password)}"
                  autocomplete="${isLogin ? 'current-password' : 'new-password'}"
                  ${state.isSubmitting ? 'disabled' : ''}
                  required
                />
              </div>

              ${
                !isLogin
                  ? `
                <div class="form-group">
                  <label for="qn-confirm-password">XÁC NHẬN MẬT KHẨU</label>
                  <input
                    id="qn-confirm-password"
                    name="confirmPassword"
                    type="password"
                    class="input ${state.errorField === 'confirmPassword' ? 'input-error' : ''}"
                    placeholder="••••••••"
                    value="${escapeHtml(state.form.confirmPassword)}"
                    autocomplete="new-password"
                    ${state.isSubmitting ? 'disabled' : ''}
                    required
                  />
                </div>
              `
                  : ''
              }

              <div
                id="qn-auth-error"
                class="error-msg"
                role="alert"
                aria-live="polite"
                style="${state.errorMessage ? 'display:block;' : 'display:none;'}"
              >${escapeHtml(state.errorMessage)}</div>

              <button
                type="submit"
                id="qn-auth-submit"
                class="btn-terra"
                ${state.isSubmitting ? 'disabled aria-busy="true"' : ''}
              >
                ${escapeHtml(submitLabel)}
              </button>

              ${
                isLogin
                  ? `
                <button
                  type="button"
                  id="qn-demo-login"
                  class="btn-demo"
                  style="width:100%;margin-top:8px;padding:8px 12px;background:#F6E8E2;border:1px dashed #C46D53;color:#C46D53;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:0.4px;cursor:pointer;transition:background 0.15s ease;"
                  ${state.isSubmitting ? 'disabled' : ''}
                >
                  Đăng nhập nhanh tài khoản mẫu (Demo)
                </button>
              `
                  : ''
              }
            </form>

            <div class="auth-switch" style="text-align:center;font-size:12px;color:#52758C;margin-top:14px;">
              ${
                isLogin
                  ? `Chưa có tài khoản? <a href="#register" id="qn-switch-mode" style="color:#C46D53;font-weight:700;text-decoration:none;border-bottom:1px solid #C46D53;">Đăng ký ngay</a>`
                  : `Đã có tài khoản? <a href="#login" id="qn-switch-mode" style="color:#C46D53;font-weight:700;text-decoration:none;border-bottom:1px solid #C46D53;">Đăng nhập ngay</a>`
              }
            </div>

            <footer class="cover-footer" style="margin-top:18px;padding-top:10px;border-top:1px solid rgba(139,164,178,0.45);text-align:center;font-size:9px;letter-spacing:2px;color:#8BA4B2;font-weight:700;">
              QUICKNOTE · NEU SDLC
            </footer>
          </div>
        </div>
      `;

      bindEvents();
    }

    function syncFormFromDom() {
      const fullNameEl = container.querySelector('#qn-fullname');
      const emailEl = container.querySelector('#qn-email');
      const passwordEl = container.querySelector('#qn-password');
      const confirmEl = container.querySelector('#qn-confirm-password');

      if (fullNameEl) state.form.fullName = fullNameEl.value;
      if (emailEl) state.form.email = emailEl.value;
      if (passwordEl) state.form.password = passwordEl.value;
      if (confirmEl) state.form.confirmPassword = confirmEl.value;
    }

    function showValidationError(validation) {
      state.errorField = validation.field || '';
      state.errorMessage = validation.message || 'Dữ liệu không hợp lệ.';
      draw();
      const fieldSelectorMap = {
        fullName: '#qn-fullname',
        email: '#qn-email',
        password: '#qn-password',
        confirmPassword: '#qn-confirm-password'
      };
      const targetSelector = fieldSelectorMap[state.errorField];
      if (targetSelector) {
        const inputEl = container.querySelector(targetSelector);
        if (inputEl) inputEl.focus();
      }
    }

    async function handleLoginSubmit() {
      syncFormFromDom();
      const validation = validateLoginInput(state.form.email, state.form.password);
      if (validation) {
        showValidationError(validation);
        return;
      }

      state.isSubmitting = true;
      state.errorMessage = '';
      state.errorField = '';
      draw();

      try {
        await invokeStoreAuth('login', [state.form.email.trim(), state.form.password]);
        state.isSubmitting = false;
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } catch (err) {
        state.isSubmitting = false;
        state.errorMessage = (err && err.message) ? err.message : 'Email hoặc mật khẩu không chính xác.';
        draw();
      }
    }

    async function handleRegisterSubmit() {
      syncFormFromDom();
      const validation = validateRegisterInput(
        state.form.fullName,
        state.form.email,
        state.form.password,
        state.form.confirmPassword
      );
      if (validation) {
        showValidationError(validation);
        return;
      }

      state.isSubmitting = true;
      state.errorMessage = '';
      state.errorField = '';
      draw();

      try {
        await invokeStoreAuth('register', [
          state.form.fullName.trim(),
          state.form.email.trim(),
          state.form.password,
          state.form.confirmPassword
        ]);
        state.isSubmitting = false;
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } catch (err) {
        state.isSubmitting = false;
        state.errorMessage = (err && err.message) ? err.message : 'Không thể đăng ký tài khoản. Vui lòng thử lại.';
        draw();
      }
    }

    async function handleDemoLogin() {
      if (state.isSubmitting) return;
      state.form.email = 'sinhvien@neu.edu.vn';
      state.form.password = '123456';
      state.isSubmitting = true;
      state.errorMessage = '';
      state.errorField = '';
      draw();

      try {
        await invokeStoreAuth('login', ['sinhvien@neu.edu.vn', '123456']);
        state.isSubmitting = false;
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } catch (err) {
        state.isSubmitting = false;
        state.errorMessage = (err && err.message) ? err.message : 'Không thể đăng nhập tài khoản mẫu.';
        draw();
      }
    }

    function bindEvents() {
      const formEl = container.querySelector('#qn-auth-form');
      const switchEl = container.querySelector('#qn-switch-mode');
      const demoBtn = container.querySelector('#qn-demo-login');
      const inputs = container.querySelectorAll('.input');

      inputs.forEach((input) => {
        input.addEventListener('input', () => {
          syncFormFromDom();
          if (state.errorMessage) {
            state.errorMessage = '';
            state.errorField = '';
            const errBox = container.querySelector('#qn-auth-error');
            if (errBox) {
              errBox.style.display = 'none';
              errBox.textContent = '';
            }
            input.classList.remove('input-error');
          }
        });
      });

      if (formEl) {
        formEl.addEventListener('submit', (e) => {
          e.preventDefault();
          if (state.isSubmitting) return;
          if (state.mode === 'login') {
            handleLoginSubmit();
          } else {
            handleRegisterSubmit();
          }
        });
      }

      if (demoBtn) {
        demoBtn.addEventListener('click', (e) => {
          e.preventDefault();
          handleDemoLogin();
        });
      }

      if (switchEl) {
        switchEl.addEventListener('click', (e) => {
          e.preventDefault();
          if (state.isSubmitting) return;
          syncFormFromDom();
          setMode(state.mode === 'login' ? 'register' : 'login');
        });
      }
    }

    draw();
  }

  window.QuickNoteAuth = {
    render,
    validateLoginInput,
    validateRegisterInput
  };
})();
