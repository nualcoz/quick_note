/**
 * QuickNote — PHẦN 2: Quản lý dữ liệu người dùng & tờ ghi chú (Store & Supabase REST Sync)
 * Lưu trữ đồng bộ trong localStorage kèm dữ liệu mẫu chuẩn thiết kế Figma,
 * đồng thời hỗ trợ đồng bộ Supabase REST API khi cấu hình biến môi trường.
 */
(function () {
  'use strict';

  const STORAGE_KEYS = {
    USERS: 'quicknote_users_v1',
    CURRENT_USER: 'quicknote_current_user_v1',
    NOTES: 'quicknote_notes_v1'
  };

  const VALID_CATEGORIES = ['TO_DO', 'TO_BUY', 'OTHERS'];

  const DEMO_USER = {
    id: '00000000-0000-4000-8000-000000000001',
    fullName: 'Nguyễn Văn A',
    full_name: 'Nguyễn Văn A',
    email: 'sinhvien@neu.edu.vn',
    password: '123456',
    created_at: '2026-11-15T08:00:00.000Z'
  };

  /**
   * 3 tờ ghi chú mẫu đúng 100% theo thiết kế Figma (Frame 2 / Frame 3)
   */
  function getInitialDemoNotes(userId) {
    return [
      {
        id: '10000000-0000-4000-8000-000000000001',
        user_id: userId,
        category: 'TO_DO',
        title: 'Ôn tập SDLC & Bảo vệ',
        items: [
          { text: 'Viết User Story & Q&A', done: true },
          { text: 'Vẽ Use Case & ERD', done: true },
          { text: 'Thiết kế Figma QuickNote', done: true },
          { text: 'Chạy 6 Test Case kiểm thử', done: false },
          { text: 'Deploy lên Vercel', done: false },
          { text: 'Xuất PDF nộp trước 20/11', done: false }
        ],
        updated_at: '2026-11-19T08:30:00.000Z'
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        user_id: userId,
        category: 'TO_BUY',
        title: 'Đồ cần mua tuần này',
        items: [
          { text: 'Sổ ghi chú giấy kem', done: true },
          { text: 'Bút gel mực xanh đen', done: false },
          { text: 'Kẹp tài liệu in báo cáo', done: false },
          { text: 'Cà phê gói ôn thi', done: false }
        ],
        updated_at: '2026-11-19T08:20:00.000Z'
      },
      {
        id: '10000000-0000-4000-8000-000000000003',
        user_id: userId,
        category: 'OTHERS',
        title: 'Lưu ý bảo mật & API',
        items: [
          { text: 'Không đẩy .env lên GitHub', done: true },
          { text: 'Bật RLS trên Supabase', done: true },
          { text: 'Check title.trim() <= 100', done: false },
          { text: 'Khóa nút Lưu khi đang gửi', done: false },
          { text: 'Che email khi chụp ảnh', done: false }
        ],
        updated_at: '2026-11-19T08:10:00.000Z'
      }
    ];
  }

  function generateUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Đảm bảo tài khoản mẫu và 3 tờ ghi chú mẫu luôn được khởi tạo sẵn trong lần chạy đầu
   */
  function ensureSeedData() {
    let users = readJson(STORAGE_KEYS.USERS, null);
    if (!Array.isArray(users) || users.length === 0) {
      users = [{ ...DEMO_USER }];
      writeJson(STORAGE_KEYS.USERS, users);
    } else {
      const hasDemo = users.some(
        (u) => String(u.email || '').toLowerCase() === DEMO_USER.email.toLowerCase()
      );
      if (!hasDemo) {
        users.unshift({ ...DEMO_USER });
        writeJson(STORAGE_KEYS.USERS, users);
      }
    }

    let notes = readJson(STORAGE_KEYS.NOTES, null);
    if (!Array.isArray(notes)) {
      notes = getInitialDemoNotes(DEMO_USER.id);
      writeJson(STORAGE_KEYS.NOTES, notes);
    }
  }

  /**
   * Chuẩn hóa category ('TO DO' -> 'TO_DO', 'TO BUY' -> 'TO_BUY', 'OTHERS' -> 'OTHERS')
   */
  function normalizeCategory(category) {
    if (typeof category !== 'string') return '';
    return category.trim().toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Kiểm tra chặt chẽ dữ liệu tờ ghi chú (đáp ứng TC01, TC02, TC03)
   */
  function validateNotePayload({ category, title, items }) {
    const cleanCategory = normalizeCategory(category || 'TO_DO');
    if (!VALID_CATEGORIES.includes(cleanCategory)) {
      throw new Error('Nhóm phân loại không hợp lệ. Chỉ chấp nhận TO_DO, TO_BUY hoặc OTHERS.');
    }

    const rawTitle = typeof title === 'string' ? title : String(title ?? '');
    const cleanTitle = rawTitle.trim();

    if (cleanTitle.length === 0) {
      throw new Error('Tiêu đề tờ ghi chú không được để trống hoặc chỉ chứa khoảng trắng.');
    }

    if (cleanTitle.length > 100 || rawTitle.trim().length > 100) {
      throw new Error('Tiêu đề tờ ghi chú không được vượt quá 100 ký tự.');
    }

    const normalizedItems = [];
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length && normalizedItems.length < 8; i++) {
        const it = items[i];
        if (typeof it === 'string') {
          const txt = it.trim();
          if (txt) normalizedItems.push({ text: txt, done: false });
        } else if (it && typeof it === 'object') {
          const txt = String(it.text ?? '').trim();
          if (txt) {
            normalizedItems.push({
              text: txt,
              done: Boolean(it.done)
            });
          }
        }
      }
    }

    return {
      category: cleanCategory,
      title: cleanTitle,
      items: normalizedItems
    };
  }

  /**
   * Đồng bộ ngầm lên Supabase REST API nếu có cấu hình window.QUICKNOTE_SUPABASE_CONFIG
   */
  async function syncSupabaseRest(path, method, body) {
    const cfg = window.QUICKNOTE_SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    try {
      const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.accessToken || cfg.anonKey}`,
          Prefer: 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (_err) {
      return null;
    }
  }

  /**
   * Lấy thông tin người dùng đang đăng nhập
   */
  function getCurrentUser() {
    ensureSeedData();
    const user = readJson(STORAGE_KEYS.CURRENT_USER, null);
    if (!user || !user.email) return null;
    return {
      id: user.id,
      fullName: user.fullName || user.full_name || 'Sinh viên NEU',
      full_name: user.full_name || user.fullName || 'Sinh viên NEU',
      email: user.email
    };
  }

  /**
   * Đăng nhập vào sổ ghi chú
   */
  function login(email, password) {
    ensureSeedData();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    if (!cleanEmail) {
      throw new Error('Vui lòng nhập email đăng nhập.');
    }
    if (!rawPassword) {
      throw new Error('Vui lòng nhập mật khẩu.');
    }

    const users = readJson(STORAGE_KEYS.USERS, []);
    const found = users.find((u) => String(u.email || '').toLowerCase() === cleanEmail);

    if (!found || found.password !== rawPassword) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const sessionUser = {
      id: found.id,
      fullName: found.fullName || found.full_name || 'Nguyễn Văn A',
      full_name: found.full_name || found.fullName || 'Nguyễn Văn A',
      email: found.email
    };
    writeJson(STORAGE_KEYS.CURRENT_USER, sessionUser);
    return sessionUser;
  }

  /**
   * Đăng ký tài khoản sổ ghi chú mới
   */
  function register(fullName, email, password, confirmPassword) {
    ensureSeedData();
    const cleanName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');
    const rawConfirm = confirmPassword !== undefined ? String(confirmPassword || '') : rawPassword;

    if (!cleanName) {
      throw new Error('Vui lòng nhập họ và tên.');
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Định dạng email không hợp lệ.');
    }
    if (rawPassword.length < 6) {
      throw new Error('Mật khẩu phải có tối thiểu 6 ký tự.');
    }
    if (rawPassword !== rawConfirm) {
      throw new Error('Xác nhận mật khẩu không khớp.');
    }

    const users = readJson(STORAGE_KEYS.USERS, []);
    const exists = users.some((u) => String(u.email || '').toLowerCase() === cleanEmail);
    if (exists) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
    }

    const newUser = {
      id: generateUuid(),
      fullName: cleanName,
      full_name: cleanName,
      email: cleanEmail,
      password: rawPassword,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    writeJson(STORAGE_KEYS.USERS, users);

    // Khởi tạo 3 tờ ghi chú mẫu cho tài khoản mới để sổ luôn sẵn sàng trải nghiệm
    const allNotes = readJson(STORAGE_KEYS.NOTES, []);
    const starterNotes = getInitialDemoNotes(newUser.id).map((n) => ({
      ...n,
      id: generateUuid(),
      user_id: newUser.id,
      updated_at: new Date().toISOString()
    }));
    writeJson(STORAGE_KEYS.NOTES, [...starterNotes, ...allNotes]);

    const sessionUser = {
      id: newUser.id,
      fullName: newUser.fullName,
      full_name: newUser.full_name,
      email: newUser.email
    };
    writeJson(STORAGE_KEYS.CURRENT_USER, sessionUser);
    return sessionUser;
  }

  /**
   * Đăng xuất khỏi phiên hiện tại
   */
  function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    return true;
  }

  /**
   * Lấy danh sách tờ ghi chú của người dùng hiện tại, hỗ trợ lọc theo category và tìm kiếm theo tiêu đề (TC05)
   */
  function getNotes(filters = {}) {
    ensureSeedData();
    const currentUser = getCurrentUser();
    const activeUserId = currentUser ? currentUser.id : DEMO_USER.id;

    const allNotes = readJson(STORAGE_KEYS.NOTES, []);
    let userNotes = allNotes.filter((n) => !n.user_id || n.user_id === activeUserId);

    const rawCategory = filters && filters.category ? String(filters.category).trim() : '';
    if (rawCategory && rawCategory.toUpperCase() !== 'ALL') {
      const targetCat = normalizeCategory(rawCategory);
      if (VALID_CATEGORIES.includes(targetCat)) {
        userNotes = userNotes.filter((n) => normalizeCategory(n.category) === targetCat);
      }
    }

    const rawQuery = filters && (filters.query ?? filters.search)
      ? String(filters.query ?? filters.search).trim().toLowerCase()
      : '';
    if (rawQuery) {
      userNotes = userNotes.filter((n) =>
        String(n.title || '').toLowerCase().includes(rawQuery)
      );
    }

    return userNotes
      .slice()
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      .map((n) => ({
        ...n,
        items: Array.isArray(n.items)
          ? n.items.map((it) => ({ text: String(it.text ?? ''), done: Boolean(it.done) }))
          : []
      }));
  }

  /**
   * Tạo tờ ghi chú mới (TC01, TC02, TC03)
   */
  function createNote(payload = {}) {
    ensureSeedData();
    const validated = validateNotePayload(payload);
    const currentUser = getCurrentUser();
    const activeUserId = currentUser ? currentUser.id : DEMO_USER.id;

    const newNote = {
      id: generateUuid(),
      user_id: activeUserId,
      category: validated.category,
      title: validated.title,
      items: validated.items,
      updated_at: new Date().toISOString()
    };

    const allNotes = readJson(STORAGE_KEYS.NOTES, []);
    allNotes.unshift(newNote);
    writeJson(STORAGE_KEYS.NOTES, allNotes);

    syncSupabaseRest('notes', 'POST', newNote);
    return { ...newNote };
  }

  /**
   * Cập nhật tờ ghi chú hiện có (TC01, TC02, TC03)
   */
  function updateNote(id, payload = {}) {
    ensureSeedData();
    if (!id) {
      throw new Error('Không tìm thấy mã tờ ghi chú cần cập nhật.');
    }

    const allNotes = readJson(STORAGE_KEYS.NOTES, []);
    const index = allNotes.findIndex((n) => String(n.id) === String(id));
    if (index === -1) {
      throw new Error('Tờ ghi chú không tồn tại hoặc đã bị xóa.');
    }

    const existing = allNotes[index];
    const validated = validateNotePayload({
      category: payload.category !== undefined ? payload.category : existing.category,
      title: payload.title !== undefined ? payload.title : existing.title,
      items: payload.items !== undefined ? payload.items : existing.items
    });

    const updatedNote = {
      ...existing,
      category: validated.category,
      title: validated.title,
      items: validated.items,
      updated_at: new Date().toISOString()
    };

    allNotes[index] = updatedNote;
    writeJson(STORAGE_KEYS.NOTES, allNotes);

    syncSupabaseRest(`notes?id=eq.${encodeURIComponent(id)}`, 'PATCH', {
      category: updatedNote.category,
      title: updatedNote.title,
      items: updatedNote.items,
      updated_at: updatedNote.updated_at
    });

    return { ...updatedNote };
  }

  /**
   * Tick / bỏ tick hoàn thành một dòng trên tờ ghi chú (TC04)
   */
  function toggleNoteItem(noteId, itemIndex) {
    ensureSeedData();
    const allNotes = readJson(STORAGE_KEYS.NOTES, []);
    const index = allNotes.findIndex((n) => String(n.id) === String(noteId));
    if (index === -1) {
      throw new Error('Không tìm thấy tờ ghi chú.');
    }

    const note = allNotes[index];
    const items = Array.isArray(note.items) ? note.items.map((it) => ({ ...it })) : [];
    const idx = Number(itemIndex);

    if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
      return { ...note, items };
    }

    items[idx].done = !items[idx].done;
    const updatedNote = {
      ...note,
      items,
      updated_at: new Date().toISOString()
    };

    allNotes[index] = updatedNote;
    writeJson(STORAGE_KEYS.NOTES, allNotes);

    syncSupabaseRest(`notes?id=eq.${encodeURIComponent(noteId)}`, 'PATCH', {
      items: updatedNote.items,
      updated_at: updatedNote.updated_at
    });

    return { ...updatedNote };
  }

  /**
   * Xóa tờ ghi chú theo id (TC06)
   */
  function deleteNote(id) {
    ensureSeedData();
    if (!id) {
      throw new Error('Không tìm thấy mã tờ ghi chú cần xóa.');
    }

    const allNotes = readJson(STORAGE_KEYS.NOTES, []);
    const nextNotes = allNotes.filter((n) => String(n.id) !== String(id));
    if (nextNotes.length === allNotes.length) {
      throw new Error('Tờ ghi chú không tồn tại hoặc đã bị xóa.');
    }

    writeJson(STORAGE_KEYS.NOTES, nextNotes);
    syncSupabaseRest(`notes?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    return true;
  }

  /**
   * Khôi phục lại dữ liệu mẫu mặc định (hữu ích khi kiểm thử)
   */
  function resetDemoData() {
    writeJson(STORAGE_KEYS.USERS, [{ ...DEMO_USER }]);
    writeJson(STORAGE_KEYS.NOTES, getInitialDemoNotes(DEMO_USER.id));
    return true;
  }

  ensureSeedData();

  window.QuickNoteStore = {
    VALID_CATEGORIES,
    DEMO_USER: {
      id: DEMO_USER.id,
      fullName: DEMO_USER.fullName,
      email: DEMO_USER.email
    },
    getCurrentUser,
    login,
    register,
    logout,
    getNotes,
    createNote,
    updateNote,
    toggleNoteItem,
    deleteNote,
    validateNotePayload,
    resetDemoData
  };
})();
