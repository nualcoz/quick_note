/**
 * QuickNote - Phần 4: Trang chủ Lưới Tờ Ghi chú Checklist, Tìm kiếm/Lọc theo nhóm
 * & Modal Tạo/Sửa/Xóa tờ ghi chú (Frame 3 & Frame 4 Figma)
 * File: src/notes.js
 */
(function () {
  'use strict';

  const MAX_TITLE_LENGTH = 100;
  const MAX_ITEMS_PER_SHEET = 8;

  const CATEGORIES = [
    { code: 'TO_DO', label: 'TO DO' },
    { code: 'TO_BUY', label: 'TO BUY' },
    { code: 'OTHERS', label: 'OTHERS' }
  ];

  // Trạng thái giao diện Trang chủ & Modal
  const state = {
    container: null,
    onLogout: null,
    activeCategory: 'ALL', // 'ALL' | 'TO_DO' | 'TO_BUY' | 'OTHERS'
    searchQuery: '',
    // Modal Tạo / Sửa
    editorModal: {
      isOpen: false,
      mode: 'create', // 'create' | 'edit'
      noteId: null,
      category: 'TO_DO',
      title: '',
      items: [],
      errorMsg: '',
      isSaving: false
    },
    // Modal Xác nhận xóa
    deleteModal: {
      isOpen: false,
      noteId: null,
      noteTitle: '',
      isDeleting: false
    }
  };

  /**
   * Chuẩn hóa mã nhóm phân loại về 'TO_DO' | 'TO_BUY' | 'OTHERS'
   */
  function normalizeCategory(raw) {
    if (!raw) return 'TO_DO';
    const upper = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
    if (upper === 'TO_DO' || upper === 'TODO') return 'TO_DO';
    if (upper === 'TO_BUY' || upper === 'TOBUY') return 'TO_BUY';
    if (upper === 'OTHERS' || upper === 'OTHER') return 'OTHERS';
    return 'TO_DO';
  }

  /**
   * Escape HTML chống XSS khi render dữ liệu người dùng
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Đảm bảo các class phụ trợ của trang chủ & modal luôn hiển thị chuẩn Figma
   */
  function ensureScopedStyles() {
    if (document.getElementById('quicknote-notes-scoped-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'quicknote-notes-scoped-styles';
    styleEl.textContent = `
      .qn-dashboard-wrap {
        min-height: 100vh;
        background: #F1EFEA;
        color: #2C2F33;
        display: flex;
        flex-direction: column;
      }
      .topbar {
        background: #FFFFFF;
        border-bottom: 1px solid #E0DCD3;
        padding: 12px 28px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .brand-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo-q {
        width: 30px;
        height: 30px;
        background: #52758C;
        color: #F7F3E6;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        flex-shrink: 0;
      }
      .brand-main {
        font-family: 'Georgia', serif;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: #2C2F33;
      }
      .brand-sub {
        font-size: 9px;
        font-weight: 600;
        color: #52758C;
        letter-spacing: 1.4px;
      }
      .user-area {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12.5px;
        color: #52758C;
      }
      .user-email {
        color: #6C7075;
        font-weight: 500;
      }
      .btn-outline {
        border: 1px solid #DCD7CB;
        background: #FFFFFF;
        color: #2C2F33;
        padding: 7px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .btn-outline:hover {
        background: #F7F3E6;
        border-color: #C46D53;
      }
      .dash-body {
        max-width: 1140px;
        width: 100%;
        margin: 0 auto;
        padding: 24px 32px 48px;
        flex: 1;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      .left-tools {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .search-box-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-box {
        width: 310px;
        background: #FFFFFF;
        border: 1px solid #DCD7CB;
        border-radius: 8px;
        padding: 9px 14px;
        font-size: 12.5px;
        color: #2C2F33;
        outline: none;
        transition: border-color 0.15s;
      }
      .search-box:focus {
        border-color: #52758C;
      }
      .pill {
        padding: 7px 13px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        border: 1px solid #DCD7CB;
        background: #FFFFFF;
        color: #52758C;
        cursor: pointer;
        user-select: none;
        transition: all 0.15s;
      }
      .pill:hover {
        border-color: #52758C;
      }
      .pill.active {
        background: #52758C;
        color: #FFFFFF;
        border-color: #52758C;
      }
      .btn-create {
        background: #C46D53;
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        padding: 9px 16px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .btn-create:hover {
        opacity: 0.92;
      }
      .sheets-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      @media (max-width: 960px) {
        .sheets-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 640px) {
        .sheets-grid {
          grid-template-columns: 1fr;
        }
        .search-box {
          width: 100%;
        }
      }
      .paper-sheet {
        background: #F7F3E6;
        border: 1px solid #DCD7CB;
        border-radius: 4px;
        box-shadow: 4px 8px 18px rgba(38, 33, 26, 0.14);
      }
      .note-sheet {
        padding: 20px 20px 14px;
        min-height: 455px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform 0.15s ease;
      }
      .note-sheet:hover {
        transform: translateY(-2px);
      }
      .cat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        font-weight: 600;
        color: #52758C;
        letter-spacing: 0.8px;
        margin-bottom: 10px;
      }
      .cat-tag {
        padding: 2px 8px;
        border-radius: 10px;
        border: 1px solid transparent;
      }
      .cat-tag.active {
        color: #C46D53;
        background: #F6E8E2;
        border: 1px solid #C46D53;
        font-weight: 700;
      }
      .sheet-title {
        text-align: center;
        font-size: 13.5px;
        font-weight: 600;
        color: #2C2F33;
        margin-bottom: 5px;
        word-break: break-word;
      }
      .sheet-underline {
        width: 145px;
        height: 1.5px;
        background: #C46D53;
        margin: 0 auto 10px;
      }
      .ruled-list {
        display: flex;
        flex-direction: column;
      }
      .ruled-row {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 6.5px 2px 5.5px;
        border-bottom: 1px solid rgba(139, 164, 178, 0.65);
        min-height: 32px;
        font-size: 12px;
        color: #2C2F33;
      }
      .ruled-row.has-item {
        cursor: pointer;
      }
      .ruled-row.has-item:hover {
        background: rgba(196, 109, 83, 0.05);
      }
      .ruled-row.done span.txt,
      .ruled-row span.txt.done {
        text-decoration: line-through;
        color: #8D9094;
      }
      .circle {
        width: 13px;
        height: 13px;
        border-radius: 50%;
        border: 1.3px solid #C46D53;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
      }
      .circle.checked {
        background: #F6E8E2;
      }
      .circle.checked::after {
        content: "";
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #C46D53;
        display: block;
      }
      .sheet-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        font-size: 11.5px;
      }
      .act-edit {
        color: #52758C;
        font-weight: 600;
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 11.5px;
      }
      .act-edit:hover {
        text-decoration: underline;
      }
      .act-stamp {
        font-size: 9px;
        color: #52758C;
        letter-spacing: 1.6px;
        font-weight: 600;
      }
      .act-del {
        color: #C74741;
        font-weight: 600;
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 11.5px;
      }
      .act-del:hover {
        text-decoration: underline;
      }
      .empty-sheets-box {
        grid-column: 1 / -1;
        text-align: center;
        padding: 48px 24px;
        color: #52758C;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(38, 33, 26, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
      }
      .modal-sheet {
        width: 100%;
        max-width: 430px;
        padding: 20px 22px;
      }
      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        font-size: 13.5px;
        font-weight: 700;
        letter-spacing: 0.6px;
        color: #2C2F33;
      }
      .modal-close-btn {
        background: none;
        border: none;
        color: #8C8F94;
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
      }
      .label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10.5px;
        font-weight: 600;
        color: #52758C;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .cat-pills-select {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
      }
      .cat-select-btn {
        padding: 5px 13px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid #DCD7CB;
        background: #FFFFFF;
        color: #52758C;
        cursor: pointer;
      }
      .cat-select-btn.active {
        color: #C46D53;
        background: #F6E8E2;
        border: 1px solid #C46D53;
        font-weight: 700;
      }
      .modal-title-input {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid #C46D53;
        border-radius: 6px;
        font-size: 12.5px;
        font-weight: 600;
        color: #2C2F33;
        background: #FFFFFF;
        margin-bottom: 6px;
        outline: none;
      }
      .modal-title-input.input-error {
        border-color: #C74741 !important;
        background: #FFF6F5;
      }
      .modal-error-msg {
        color: #C74741;
        font-size: 11.5px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .modal-item-input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 12px;
        color: #2C2F33;
        outline: none;
        padding: 2px 0;
      }
      .modal-item-input.done {
        text-decoration: line-through;
        color: #8D9094;
      }
      .modal-item-remove {
        background: none;
        border: none;
        color: #8C8F94;
        cursor: pointer;
        font-size: 12px;
        padding: 2px 5px;
      }
      .modal-item-remove:hover {
        color: #C74741;
      }
      .add-line {
        display: inline-block;
        font-size: 11.5px;
        font-weight: 600;
        color: #C46D53;
        margin-top: 9px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px 0;
      }
      .add-line:disabled {
        color: #8C8F94;
        cursor: not-allowed;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .btn-sm-terra {
        background: #C46D53;
        color: #FFFFFF;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-sm-terra:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-sm-danger {
        background: #C74741;
        color: #FFFFFF;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-sm-danger:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(styleEl);
  }

  /**
   * Lấy đối tượng Store an toàn
   */
  function getStore() {
    return window.QuickNoteStore;
  }

  /**
   * Lấy toàn bộ danh sách ghi chú của người dùng hiện tại từ Store
   */
  function fetchAllUserNotes() {
    const store = getStore();
    if (!store || typeof store.getNotes !== 'function') return [];
    try {
      const list = store.getNotes({});
      return Array.isArray(list) ? list : [];
    } catch (e) {
      try {
        const list = store.getNotes();
        return Array.isArray(list) ? list : [];
      } catch (_) {
        return [];
      }
    }
  }

  /**
   * Lấy danh sách ghi chú đã lọc theo nhóm (category) và từ khóa tiêu đề (query)
   * Đáp ứng AC3 & TC05: lọc realtime không phân biệt hoa thường theo tiêu đề
   */
  function fetchFilteredNotes() {
    const store = getStore();
    const catFilter = state.activeCategory === 'ALL' ? '' : state.activeCategory;
    const rawQuery = state.searchQuery || '';
    const normQuery = rawQuery.trim().toLowerCase();

    let notes = [];
    if (store && typeof store.getNotes === 'function') {
      try {
        const res = store.getNotes({
          category: catFilter || undefined,
          query: rawQuery
        });
        if (Array.isArray(res)) {
          notes = res;
        }
      } catch (e) {
        notes = fetchAllUserNotes();
      }
    }

    // Đảm bảo lọc chính xác ở phía client trong mọi trường hợp
    return notes.filter(function (note) {
      if (!note) return false;
      const noteCat = normalizeCategory(note.category);
      const matchCat =
        state.activeCategory === 'ALL' || noteCat === state.activeCategory;
      const titleText = String(note.title || '').toLowerCase();
      const matchQuery = !normQuery || titleText.indexOf(normQuery) !== -1;
      return matchCat && matchQuery;
    });
  }

  /**
   * Dựng HTML cho 1 tờ giấy ghi chú (.paper-sheet.note-sheet) luôn đủ 8 dòng kẻ
   */
  function renderNoteSheetHtml(note) {
    const noteCat = normalizeCategory(note.category);
    const items = Array.isArray(note.items) ? note.items : [];

    // 3 nhãn phân loại trên đầu tờ giấy: TO DO, TO BUY, OTHERS
    const catTagsHtml = CATEGORIES.map(function (c) {
      const isActive = c.code === noteCat;
      return `<span class="cat-tag${isActive ? ' active' : ''}">${escapeHtml(c.label)}</span>`;
    }).join('');

    // Luôn dựng đúng 8 dòng kẻ ngang (.ruled-row)
    const rowsHtml = [];
    for (let idx = 0; idx < MAX_ITEMS_PER_SHEET; idx++) {
      const item = items[idx];
      if (item && typeof item.text === 'string' && item.text.trim() !== '') {
        const isDone = Boolean(item.done);
        rowsHtml.push(`
          <div class="ruled-row has-item${isDone ? ' done' : ''}" data-action="toggle-item" data-note-id="${escapeHtml(note.id)}" data-item-index="${idx}" title="Bấm để đánh dấu hoàn thành">
            <span class="circle${isDone ? ' checked' : ''}"></span>
            <span class="txt${isDone ? ' done' : ''}">${escapeHtml(item.text)}</span>
          </div>
        `);
      } else {
        // Dòng trống vẫn hiển thị vòng tròn cam đất rỗng và đường kẻ ngang
        rowsHtml.push(`
          <div class="ruled-row empty-row">
            <span class="circle"></span>
            <span class="txt"></span>
          </div>
        `);
      }
    }

    return `
      <div class="paper-sheet note-sheet" data-note-id="${escapeHtml(note.id)}">
        <div>
          <div class="cat-row">
            ${catTagsHtml}
          </div>
          <div class="sheet-title">${escapeHtml(note.title)}</div>
          <div class="sheet-underline"></div>
          <div class="ruled-list">
            ${rowsHtml.join('')}
          </div>
        </div>
        <div class="sheet-footer">
          <button type="button" class="act-edit" data-action="open-edit" data-note-id="${escapeHtml(note.id)}">Sửa</button>
          <span class="act-stamp">QUICKNOTE</span>
          <button type="button" class="act-del" data-action="open-delete" data-note-id="${escapeHtml(note.id)}">Xóa</button>
        </div>
      </div>
    `;
  }

  /**
   * Dựng HTML cho Modal Tạo / Sửa tờ ghi chú (Frame 4 - Modal 1)
   */
  function renderEditorModalHtml() {
    if (!state.editorModal.isOpen) return '';
    const m = state.editorModal;
    const isEdit = m.mode === 'edit';
    const modalHeading = isEdit ? 'CHỈNH SỬA TỜ GHI CHÚ' : 'TẠO TỜ GHI CHÚ MỚI';
    const charCount = m.title.length;
    const isOverLimit = charCount > MAX_TITLE_LENGTH;

    const catPillsHtml = CATEGORIES.map(function (c) {
      const isActive = c.code === m.category;
      return `
        <button type="button" class="cat-tag cat-select-btn${isActive ? ' active' : ''}" data-action="modal-select-cat" data-category="${c.code}">
          ${escapeHtml(c.label)}
        </button>
      `;
    }).join('');

    const itemRowsHtml = m.items.map(function (item, idx) {
      const isDone = Boolean(item.done);
      return `
        <div class="ruled-row" data-modal-item-index="${idx}">
          <span class="circle${isDone ? ' checked' : ''}" style="cursor:pointer;" data-action="modal-toggle-item" data-index="${idx}" title="Tick hoàn thành dòng"></span>
          <input
            type="text"
            class="modal-item-input txt${isDone ? ' done' : ''}"
            data-action="modal-edit-item"
            data-index="${idx}"
            placeholder="Nhập nội dung dòng ${idx + 1}..."
            value="${escapeHtml(item.text)}"
          />
          <button type="button" class="modal-item-remove" data-action="modal-remove-item" data-index="${idx}" title="Xóa dòng này">✕</button>
        </div>
      `;
    }).join('');

    const canAddMoreLines = m.items.length < MAX_ITEMS_PER_SHEET;

    return `
      <div class="modal-overlay" id="qn-editor-modal-overlay" data-action="close-editor-overlay">
        <div class="paper-sheet modal-sheet" role="dialog" aria-modal="true" aria-labelledby="qn-editor-modal-title">
          <div class="modal-head">
            <span id="qn-editor-modal-title">${modalHeading}</span>
            <button type="button" class="modal-close-btn" data-action="close-editor" aria-label="Đóng">✕</button>
          </div>

          <div class="label-row">
            <span>PHÂN LOẠI NHÓM</span>
          </div>
          <div class="cat-pills-select">
            ${catPillsHtml}
          </div>

          <div class="label-row">
            <span>TIÊU ĐỀ TỜ GHI CHÚ *</span>
            <span id="qn-title-counter" style="color:${isOverLimit ? '#C74741' : '#8C8F94'};font-weight:${isOverLimit ? '700' : '400'};">${charCount} / ${MAX_TITLE_LENGTH} ký tự</span>
          </div>
          <input
            type="text"
            id="qn-modal-title-input"
            class="input modal-title-input${m.errorMsg ? ' input-error' : ''}"
            placeholder="Nhập tiêu đề tờ ghi chú (1 - 100 ký tự)..."
            value="${escapeHtml(m.title)}"
            autocomplete="off"
          />
          <div id="qn-modal-error" class="error-msg modal-error-msg" style="display:${m.errorMsg ? 'block' : 'none'};">
            ${escapeHtml(m.errorMsg)}
          </div>

          <div class="label-row" style="margin-top:8px;">
            <span>DANH SÁCH MỤC GHI CHÚ (${m.items.length}/${MAX_ITEMS_PER_SHEET} DÒNG)</span>
          </div>
          <div class="ruled-list" id="qn-modal-items-list">
            ${itemRowsHtml}
          </div>

          ${
            canAddMoreLines
              ? `<button type="button" class="add-line" data-action="modal-add-line">+ Thêm dòng mới...</button>`
              : `<div class="add-line" style="color:#8C8F94;cursor:default;">Đã đạt tối đa 8 dòng trên một tờ giấy</div>`
          }

          <div class="modal-actions">
            <button type="button" class="btn-outline" data-action="close-editor" ${m.isSaving ? 'disabled' : ''}>Hủy</button>
            <button type="button" class="btn-sm-terra" id="qn-btn-save-note" data-action="save-note" ${m.isSaving ? 'disabled' : ''}>
              ${m.isSaving ? 'Đang lưu...' : 'Lưu tờ ghi chú'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Dựng HTML cho Modal Xác nhận xóa tờ ghi chú (Frame 4 - Modal 2)
   */
  function renderDeleteModalHtml() {
    if (!state.deleteModal.isOpen) return '';
    const d = state.deleteModal;

    return `
      <div class="modal-overlay" id="qn-delete-modal-overlay" data-action="close-delete-overlay">
        <div class="paper-sheet modal-sheet" role="dialog" aria-modal="true" aria-labelledby="qn-delete-modal-title" style="padding:18px 22px;">
          <div class="modal-head" style="margin-bottom:8px;font-size:13px;">
            <span id="qn-delete-modal-title">XÁC NHẬN XÓA TỜ GHI CHÚ?</span>
          </div>
          <p style="font-size:12.5px;color:#6C7075;line-height:1.45;">
            Bạn có chắc muốn xóa tờ ghi chú${d.noteTitle ? ` <strong>"${escapeHtml(d.noteTitle)}"</strong>` : ''} này khỏi sổ? Hành động này không thể hoàn tác.
          </p>
          <div class="modal-actions" style="margin-top:14px;">
            <button type="button" class="btn-outline" data-action="cancel-delete" ${d.isDeleting ? 'disabled' : ''}>Giữ lại</button>
            <button type="button" class="btn-sm-danger" id="qn-btn-confirm-delete" data-action="confirm-delete" ${d.isDeleting ? 'disabled' : ''}>
              ${d.isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Cập nhật riêng lưới tờ giấy và số lượng trên nút Tất cả (N) để giữ nguyên focus ô tìm kiếm
   */
  function updateGridAndPillsOnly() {
    if (!state.container) return;
    const allNotes = fetchAllUserNotes();
    const filteredNotes = fetchFilteredNotes();

    const allPill = state.container.querySelector('[data-filter-cat="ALL"]');
    if (allPill) {
      allPill.textContent = `Tất cả (${allNotes.length})`;
    }

    const pills = state.container.querySelectorAll('.pill[data-filter-cat]');
    pills.forEach(function (pill) {
      const cat = pill.getAttribute('data-filter-cat');
      if (cat === state.activeCategory) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    const gridEl = state.container.querySelector('.sheets-grid');
    if (gridEl) {
      if (filteredNotes.length === 0) {
        const isNewEmptyAccount = allNotes.length === 0;
        gridEl.innerHTML = isNewEmptyAccount
          ? `
            <div class="paper-sheet empty-sheets-box" data-empty-account="true">
              <div style="font-weight:700;font-size:14px;letter-spacing:1px;margin-bottom:8px;color:#52758C;">SỔ GHI CHÚ CỦA BẠN ĐANG TRỐNG</div>
              <div style="width:120px;height:1.5px;background:#C46D53;margin:0 auto 12px;"></div>
              <div style="font-size:12.5px;color:#8C8F94;max-width:440px;margin:0 auto;line-height:1.5;">Chào mừng tài khoản mới! Hiện chưa có tờ ghi chú nào trên bàn làm việc.<br/>Hãy bấm nút <strong>"+ Tạo tờ ghi chú"</strong> ở góc phải để viết tờ ghi chú đầu tiên.</div>
              <button type="button" class="btn-create" data-action="open-create" style="margin-top:14px;">+ Tạo tờ ghi chú đầu tiên</button>
            </div>
          `
          : `
            <div class="paper-sheet empty-sheets-box">
              <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Không tìm thấy tờ ghi chú nào phù hợp</div>
              <div style="font-size:12px;color:#8C8F94;">Hãy thử đổi bộ lọc nhóm, từ khóa tìm kiếm hoặc bấm "+ Tạo tờ ghi chú".</div>
            </div>
          `;
      } else {
        gridEl.innerHTML = filteredNotes.map(renderNoteSheetHtml).join('');
      }
    }
  }

  /**
   * Render toàn bộ giao diện Trang chủ + Modals
   */
  function renderView() {
    if (!state.container) return;
    ensureScopedStyles();

    const store = getStore();
    const currentUser =
      store && typeof store.getCurrentUser === 'function'
        ? store.getCurrentUser()
        : null;
    const userEmail =
      (currentUser && currentUser.email) || 'sinhvien@neu.edu.vn';

    const allNotes = fetchAllUserNotes();
    const filteredNotes = fetchFilteredNotes();

    const isNewEmptyAccount = allNotes.length === 0;
    const sheetsHtml =
      filteredNotes.length > 0
        ? filteredNotes.map(renderNoteSheetHtml).join('')
        : isNewEmptyAccount
          ? `
            <div class="paper-sheet empty-sheets-box" data-empty-account="true">
              <div style="font-weight:700;font-size:14px;letter-spacing:1px;margin-bottom:8px;color:#52758C;">SỔ GHI CHÚ CỦA BẠN ĐANG TRỐNG</div>
              <div style="width:120px;height:1.5px;background:#C46D53;margin:0 auto 12px;"></div>
              <div style="font-size:12.5px;color:#8C8F94;max-width:440px;margin:0 auto;line-height:1.5;">Chào mừng tài khoản mới! Hiện chưa có tờ ghi chú nào trên bàn làm việc.<br/>Hãy bấm nút <strong>"+ Tạo tờ ghi chú"</strong> ở góc phải để viết tờ ghi chú đầu tiên.</div>
              <button type="button" class="btn-create" data-action="open-create" style="margin-top:14px;">+ Tạo tờ ghi chú đầu tiên</button>
            </div>
          `
          : `
            <div class="paper-sheet empty-sheets-box">
              <div style="font-weight:600;font-size:14px;margin-bottom:6px;">Không tìm thấy tờ ghi chú nào phù hợp</div>
              <div style="font-size:12px;color:#8C8F94;">Hãy thử đổi bộ lọc nhóm, từ khóa tìm kiếm hoặc bấm "+ Tạo tờ ghi chú".</div>
            </div>
          `;

    state.container.innerHTML = `
      <div class="qn-dashboard-wrap">
        <!-- Topbar -->
        <header class="topbar">
          <div class="brand-row">
            <div class="logo-q">Q</div>
            <div>
              <div class="brand-main">QUICKNOTE</div>
              <div class="brand-sub">CHECKLIST &amp; NOTES</div>
            </div>
          </div>
          <div class="user-area">
            <span class="user-email">${escapeHtml(userEmail)}</span>
            <button type="button" class="btn-outline" id="qn-btn-logout" data-action="logout">Đăng xuất</button>
          </div>
        </header>

        <!-- Main Body -->
        <main class="dash-body">
          <div class="toolbar">
            <div class="left-tools">
              <div class="search-box-wrap">
                <input
                  type="text"
                  id="qn-search-input"
                  class="search-box"
                  placeholder="🔍 Tìm kiếm theo tiêu đề ghi chú..."
                  value="${escapeHtml(state.searchQuery)}"
                  autocomplete="off"
                />
              </div>
              <button type="button" class="pill${state.activeCategory === 'ALL' ? ' active' : ''}" data-action="filter-cat" data-filter-cat="ALL">
                Tất cả (${allNotes.length})
              </button>
              <button type="button" class="pill${state.activeCategory === 'TO_DO' ? ' active' : ''}" data-action="filter-cat" data-filter-cat="TO_DO">
                TO DO
              </button>
              <button type="button" class="pill${state.activeCategory === 'TO_BUY' ? ' active' : ''}" data-action="filter-cat" data-filter-cat="TO_BUY">
                TO BUY
              </button>
              <button type="button" class="pill${state.activeCategory === 'OTHERS' ? ' active' : ''}" data-action="filter-cat" data-filter-cat="OTHERS">
                OTHERS
              </button>
            </div>
            <button type="button" class="btn-create" id="qn-btn-open-create" data-action="open-create">+ Tạo tờ ghi chú</button>
          </div>

          <!-- 3-Column Checklist Paper Sheets Grid -->
          <div class="sheets-grid">
            ${sheetsHtml}
          </div>
        </main>

        <!-- Modals -->
        ${renderEditorModalHtml()}
        ${renderDeleteModalHtml()}
      </div>
    `;

    bindEvents();
  }

  /**
   * Mở Modal Tạo tờ ghi chú mới
   */
  function openCreateModal() {
    const defaultCat =
      state.activeCategory !== 'ALL' ? state.activeCategory : 'TO_DO';
    state.editorModal = {
      isOpen: true,
      mode: 'create',
      noteId: null,
      category: defaultCat,
      title: '',
      items: [
        { text: '', done: false },
        { text: '', done: false },
        { text: '', done: false }
      ],
      errorMsg: '',
      isSaving: false
    };
    renderView();
    const titleInput = document.getElementById('qn-modal-title-input');
    if (titleInput) titleInput.focus();
  }

  /**
   * Mở Modal Chỉnh sửa tờ ghi chú
   */
  function openEditModal(noteId) {
    const allNotes = fetchAllUserNotes();
    const target = allNotes.find(function (n) {
      return String(n.id) === String(noteId);
    });
    if (!target) return;

    const clonedItems = Array.isArray(target.items)
      ? target.items.slice(0, MAX_ITEMS_PER_SHEET).map(function (it) {
          return { text: String(it.text || ''), done: Boolean(it.done) };
        })
      : [];

    if (clonedItems.length === 0) {
      clonedItems.push({ text: '', done: false });
    }

    state.editorModal = {
      isOpen: true,
      mode: 'edit',
      noteId: target.id,
      category: normalizeCategory(target.category),
      title: String(target.title || ''),
      items: clonedItems,
      errorMsg: '',
      isSaving: false
    };
    renderView();
    const titleInput = document.getElementById('qn-modal-title-input');
    if (titleInput) titleInput.focus();
  }

  /**
   * Đóng Modal Tạo / Sửa
   */
  function closeEditorModal() {
    if (state.editorModal.isSaving) return;
    state.editorModal.isOpen = false;
    state.editorModal.errorMsg = '';
    renderView();
  }

  /**
   * Mở Modal Xác nhận xóa tờ ghi chú (TC06)
   */
  function openDeleteModal(noteId) {
    const allNotes = fetchAllUserNotes();
    const target = allNotes.find(function (n) {
      return String(n.id) === String(noteId);
    });
    state.deleteModal = {
      isOpen: true,
      noteId: noteId,
      noteTitle: target ? String(target.title || '') : '',
      isDeleting: false
    };
    renderView();
  }

  /**
   * Đóng Modal Xác nhận xóa
   */
  function closeDeleteModal() {
    if (state.deleteModal.isDeleting) return;
    state.deleteModal = {
      isOpen: false,
      noteId: null,
      noteTitle: '',
      isDeleting: false
    };
    renderView();
  }

  /**
   * Kiểm tra dữ liệu tiêu đề và lưu tờ ghi chú (Đáp ứng TC01, TC02, TC03 & BUG-01)
   */
  function handleSaveNote() {
    const m = state.editorModal;
    // Chống bấm đúp (BUG-01)
    if (m.isSaving) return;

    const rawTitle = String(m.title || '');
    const trimmedTitle = rawTitle.trim();

    // TC02: Tiêu đề rỗng hoặc chỉ chứa khoảng trắng
    if (!trimmedTitle) {
      m.errorMsg = 'Tiêu đề tờ ghi chú không được để trống hoặc chỉ chứa khoảng trắng.';
      updateModalErrorUI();
      return;
    }

    // TC03: Tiêu đề vượt quá 100 ký tự
    if (rawTitle.length > MAX_TITLE_LENGTH || trimmedTitle.length > MAX_TITLE_LENGTH) {
      m.errorMsg = 'Tiêu đề không được vượt quá 100 ký tự.';
      updateModalErrorUI();
      return;
    }

    // Khóa nút Lưu ngay lập tức (BUG-01: isSaving = true & disabled nút Lưu)
    m.isSaving = true;
    m.errorMsg = '';
    const saveBtn = document.getElementById('qn-btn-save-note');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu...';
    }

    // Lọc các dòng có nội dung hợp lệ (tối đa 8 dòng)
    const cleanItems = m.items
      .map(function (it) {
        return {
          text: String(it.text || '').trim(),
          done: Boolean(it.done)
        };
      })
      .filter(function (it) {
        return it.text.length > 0;
      })
      .slice(0, MAX_ITEMS_PER_SHEET);

    const payload = {
      category: normalizeCategory(m.category),
      title: trimmedTitle,
      items: cleanItems
    };

    const store = getStore();
    try {
      let result;
      if (m.mode === 'edit' && m.noteId !== null) {
        result = store.updateNote(m.noteId, payload);
      } else {
        result = store.createNote(payload);
      }

      if (result && typeof result.then === 'function') {
        result
          .then(function () {
            m.isSaving = false;
            m.isOpen = false;
            renderView();
          })
          .catch(function (err) {
            m.isSaving = false;
            m.errorMsg = (err && err.message) || 'Không thể lưu tờ ghi chú.';
            renderView();
          });
      } else {
        m.isSaving = false;
        m.isOpen = false;
        renderView();
      }
    } catch (err) {
      m.isSaving = false;
      m.errorMsg = (err && err.message) || 'Dữ liệu tờ ghi chú không hợp lệ.';
      renderView();
    }
  }

  /**
   * Hiển thị lỗi viền đỏ ngay trên Modal mà không làm mất focus
   */
  function updateModalErrorUI() {
    const titleInput = document.getElementById('qn-modal-title-input');
    const errorEl = document.getElementById('qn-modal-error');
    if (titleInput) {
      if (state.editorModal.errorMsg) {
        titleInput.classList.add('input-error');
      } else {
        titleInput.classList.remove('input-error');
      }
    }
    if (errorEl) {
      if (state.editorModal.errorMsg) {
        errorEl.textContent = state.editorModal.errorMsg;
        errorEl.style.display = 'block';
      } else {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    }
  }

  /**
   * Thực hiện xóa tờ ghi chú sau khi xác nhận (TC06)
   */
  function handleConfirmDelete() {
    const d = state.deleteModal;
    if (!d.isOpen || d.isDeleting || d.noteId === null) return;

    d.isDeleting = true;
    const confirmBtn = document.getElementById('qn-btn-confirm-delete');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Đang xóa...';
    }

    const store = getStore();
    try {
      const res =
        store && typeof store.deleteNote === 'function'
          ? store.deleteNote(d.noteId)
          : null;
      if (res && typeof res.then === 'function') {
        res
          .then(function () {
            d.isDeleting = false;
            d.isOpen = false;
            d.noteId = null;
            renderView();
          })
          .catch(function () {
            d.isDeleting = false;
            renderView();
          });
      } else {
        d.isDeleting = false;
        d.isOpen = false;
        d.noteId = null;
        renderView();
      }
    } catch (_) {
      d.isDeleting = false;
      d.isOpen = false;
      renderView();
    }
  }

  /**
   * Gắn sự kiện tương tác cho Trang chủ và các Modal
   */
  function bindEvents() {
    if (!state.container) return;

    // 1. Ô tìm kiếm realtime theo tiêu đề (AC3 & TC05)
    const searchInput = state.container.querySelector('#qn-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = e.target.value;
        updateGridAndPillsOnly();
      });
    }

    // 2. Ô nhập tiêu đề trong Modal Tạo/Sửa: đếm ký tự trực tiếp X / 100 ký tự
    const modalTitleInput = state.container.querySelector('#qn-modal-title-input');
    if (modalTitleInput) {
      modalTitleInput.addEventListener('input', function (e) {
        state.editorModal.title = e.target.value;
        if (state.editorModal.errorMsg) {
          state.editorModal.errorMsg = '';
          updateModalErrorUI();
        }
        const counterEl = document.getElementById('qn-title-counter');
        if (counterEl) {
          const len = state.editorModal.title.length;
          const over = len > MAX_TITLE_LENGTH;
          counterEl.textContent = `${len} / ${MAX_TITLE_LENGTH} ký tự`;
          counterEl.style.color = over ? '#C74741' : '#8C8F94';
          counterEl.style.fontWeight = over ? '700' : '400';
        }
      });
    }

    // 3. Các ô nhập dòng mục ghi chú trong Modal
    const itemInputs = state.container.querySelectorAll('[data-action="modal-edit-item"]');
    itemInputs.forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        const idx = Number(inp.getAttribute('data-index'));
        if (state.editorModal.items[idx]) {
          state.editorModal.items[idx].text = e.target.value;
        }
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (state.editorModal.items.length < MAX_ITEMS_PER_SHEET) {
            state.editorModal.items.push({ text: '', done: false });
            renderView();
            const allInps = state.container.querySelectorAll('[data-action="modal-edit-item"]');
            const lastInp = allInps[allInps.length - 1];
            if (lastInp) lastInp.focus();
          }
        }
      });
    });

    // 4. Ủy quyền sự kiện Click trên toàn bộ container
    state.container.onclick = function (e) {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');

      // Đăng xuất
      if (action === 'logout') {
        e.preventDefault();
        const store = getStore();
        if (store && typeof store.logout === 'function') {
          store.logout();
        }
        if (typeof state.onLogout === 'function') {
          state.onLogout();
        }
        return;
      }

      // Lọc theo nhóm (.pill)
      if (action === 'filter-cat') {
        e.preventDefault();
        const selectedCat = actionEl.getAttribute('data-filter-cat') || 'ALL';
        state.activeCategory = selectedCat;
        updateGridAndPillsOnly();
        return;
      }

      // Mở Modal Tạo tờ ghi chú mới
      if (action === 'open-create') {
        e.preventDefault();
        openCreateModal();
        return;
      }

      // Mở Modal Sửa tờ ghi chú
      if (action === 'open-edit') {
        e.preventDefault();
        const noteId = actionEl.getAttribute('data-note-id');
        openEditModal(noteId);
        return;
      }

      // Mở Modal Xác nhận xóa tờ ghi chú
      if (action === 'open-delete') {
        e.preventDefault();
        const noteId = actionEl.getAttribute('data-note-id');
        openDeleteModal(noteId);
        return;
      }

      // Tick / Bỏ tick hoàn thành trực tiếp trên dòng của tờ giấy (TC04)
      if (action === 'toggle-item') {
        e.preventDefault();
        const noteId = actionEl.getAttribute('data-note-id');
        const itemIdx = Number(actionEl.getAttribute('data-item-index'));
        const store = getStore();
        if (store && typeof store.toggleNoteItem === 'function') {
          const res = store.toggleNoteItem(noteId, itemIdx);
          if (res && typeof res.then === 'function') {
            res.then(function () {
              updateGridAndPillsOnly();
            });
          } else {
            updateGridAndPillsOnly();
          }
        }
        return;
      }

      // Chọn nhóm trong Modal Tạo/Sửa
      if (action === 'modal-select-cat') {
        e.preventDefault();
        const newCat = actionEl.getAttribute('data-category');
        if (newCat) {
          state.editorModal.category = normalizeCategory(newCat);
          renderView();
        }
        return;
      }

      // Tick trạng thái dòng trong Modal Tạo/Sửa
      if (action === 'modal-toggle-item') {
        e.preventDefault();
        const idx = Number(actionEl.getAttribute('data-index'));
        if (state.editorModal.items[idx]) {
          state.editorModal.items[idx].done = !state.editorModal.items[idx].done;
          renderView();
        }
        return;
      }

      // Xóa 1 dòng trong Modal Tạo/Sửa
      if (action === 'modal-remove-item') {
        e.preventDefault();
        const idx = Number(actionEl.getAttribute('data-index'));
        state.editorModal.items.splice(idx, 1);
        renderView();
        return;
      }

      // Thêm dòng mới trong Modal Tạo/Sửa (tối đa 8 dòng)
      if (action === 'modal-add-line') {
        e.preventDefault();
        if (state.editorModal.items.length < MAX_ITEMS_PER_SHEET) {
          state.editorModal.items.push({ text: '', done: false });
          renderView();
          const allInps = state.container.querySelectorAll('[data-action="modal-edit-item"]');
          const lastInp = allInps[allInps.length - 1];
          if (lastInp) lastInp.focus();
        }
        return;
      }

      // Đóng Modal Tạo/Sửa
      if (action === 'close-editor') {
        e.preventDefault();
        closeEditorModal();
        return;
      }

      if (action === 'close-editor-overlay' && e.target === actionEl) {
        closeEditorModal();
        return;
      }

      // Lưu tờ ghi chú (TC01, TC02, TC03, BUG-01)
      if (action === 'save-note') {
        e.preventDefault();
        handleSaveNote();
        return;
      }

      // Hủy xóa / Giữ lại tờ ghi chú
      if (action === 'cancel-delete') {
        e.preventDefault();
        closeDeleteModal();
        return;
      }

      if (action === 'close-delete-overlay' && e.target === actionEl) {
        closeDeleteModal();
        return;
      }

      // Xác nhận xóa tờ ghi chú (TC06)
      if (action === 'confirm-delete') {
        e.preventDefault();
        handleConfirmDelete();
        return;
      }
    };
  }

  /**
   * Điểm vào chính được src/app.js gọi:
   * window.QuickNoteNotes.render(container, onLogout)
   */
  function render(container, onLogout) {
    if (!container) return;
    state.container = container;
    state.onLogout = onLogout;
    state.activeCategory = 'ALL';
    state.searchQuery = '';
    state.editorModal.isOpen = false;
    state.editorModal.isSaving = false;
    state.deleteModal.isOpen = false;
    state.deleteModal.isDeleting = false;
    renderView();
  }

  window.QuickNoteNotes = {
    render: render,
    openCreateModal: openCreateModal,
    openEditModal: openEditModal,
    openDeleteModal: openDeleteModal,
    _state: state
  };
})();
