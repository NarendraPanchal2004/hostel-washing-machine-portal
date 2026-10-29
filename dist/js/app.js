/**
 * Smart Library Management System - Application Controller Logic
 * College Academic Mini Project - Computer Engineering (DSA Syllabus)
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initApp() {
  const SinglyLinkedList = window.SinglyLinkedList;
  const DoublyLinkedList = window.DoublyLinkedList;
  const Stack = window.Stack;
  const Queue = window.Queue;
  const CircularQueue = window.CircularQueue;
  const PriorityQueue = window.PriorityQueue;
  const Deque = window.Deque;
  const SparseMatrix = window.SparseMatrix;
  const SearchingAlgorithms = window.SearchingAlgorithms;
  const SortingAlgorithms = window.SortingAlgorithms;
  const AlgorithmicParadigms = window.AlgorithmicParadigms;

  // Initialize Core Data Structures
  const booksSLL = new SinglyLinkedList();
  const membersDLL = new DoublyLinkedList();
  const returnStack = new Stack(20);
  const waitingQueue = new Queue(20);
  const circularQ = new CircularQueue(5);
  const priorityQ = new PriorityQueue(false); // Descending (high priority score first)
  const dequeDS = new Deque(10);
  const issueSparseMatrix = new SparseMatrix(4, 5);

  let activeIssuedRecords = (window.initialIssuedRecords && window.initialIssuedRecords.length > 0)
    ? [...window.initialIssuedRecords]
    : [
        { id: 1, bookId: 101, memberId: "M001", memberName: "Alex Mercer", bookTitle: "Data Structures & Algorithms in C++", issueDate: "2026-10-01", dueDate: "2026-10-15", status: "Active" },
        { id: 2, bookId: 102, memberId: "M001", memberName: "Alex Mercer", bookTitle: "Introduction to Algorithms (CLRS)", issueDate: "2026-09-25", dueDate: "2026-10-09", status: "Active" },
        { id: 3, bookId: 103, memberId: "M002", memberName: "Dr. Sarah Connor", bookTitle: "Operating System Concepts", issueDate: "2026-10-02", dueDate: "2026-10-16", status: "Active" }
      ];

  function showGlobalAlert(msg) {
    const banner = document.getElementById('globalAlertBanner');
    if (!banner) return;
    banner.textContent = msg;
    banner.style.display = 'block';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 4500);
  }

  // Helper Secondary SLL for Concatenation Demo
  const secondarySLL = new SinglyLinkedList();
  secondarySLL.insertAtEnd({ id: 901, title: "Quantum Computing Basics", author: "R. Feynman", category: "Physics", totalCopies: 2, availableCopies: 2, issuedCopies: 0 });
  secondarySLL.insertAtEnd({ id: 902, title: "Cloud Native Architecture", author: "B. Burns", category: "Cloud", totalCopies: 3, availableCopies: 3, issuedCopies: 0 });

  // Initial Data Population (Fail-Safe with Default Fallbacks)
  function initData() {
    const sampleBooks = (window.initialSampleBooks && window.initialSampleBooks.length > 0)
      ? window.initialSampleBooks
      : [
          { id: 101, title: "Data Structures & Algorithms in C++", author: "Mark Allen Weiss", category: "Computer Engg", totalCopies: 5, availableCopies: 3, issuedCopies: 2, isAvailable: true },
          { id: 102, title: "Introduction to Algorithms (CLRS)", author: "Cormen, Leiserson, Rivest", category: "Algorithms", totalCopies: 4, availableCopies: 1, issuedCopies: 3, isAvailable: true },
          { id: 103, title: "Operating System Concepts", author: "Silberschatz & Galvin", category: "Computer Engg", totalCopies: 3, availableCopies: 0, issuedCopies: 3, isAvailable: false },
          { id: 104, title: "Clean Code", author: "Robert C. Martin", category: "Software Engg", totalCopies: 6, availableCopies: 4, issuedCopies: 2, isAvailable: true },
          { id: 105, title: "Database System Concepts", author: "Korth & Sudarshan", category: "Databases", totalCopies: 4, availableCopies: 2, issuedCopies: 2, isAvailable: true },
          { id: 106, title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell & Peter Norvig", category: "AI & ML", totalCopies: 2, availableCopies: 0, issuedCopies: 2, isAvailable: false },
          { id: 107, title: "Computer Networks", author: "Andrew S. Tanenbaum", category: "Networking", totalCopies: 5, availableCopies: 5, issuedCopies: 0, isAvailable: true },
          { id: 108, title: "Discrete Mathematics and Its Applications", author: "Kenneth H. Rosen", category: "Mathematics", totalCopies: 3, availableCopies: 2, issuedCopies: 1, isAvailable: true }
        ];

    const sampleMembers = (window.initialSampleMembers && window.initialSampleMembers.length > 0)
      ? window.initialSampleMembers
      : [
          { id: 201, memberId: "M001", name: "Alex Mercer", department: "Computer Engg", contact: "9876543210", role: "Student", priorityScore: 1, booksIssued: 2 },
          { id: 202, memberId: "M002", name: "Dr. Sarah Connor", department: "Computer Engg", contact: "9876543211", role: "Faculty", priorityScore: 3, booksIssued: 1 },
          { id: 203, memberId: "M003", name: "David Miller", department: "Information Tech", contact: "9876543212", role: "Student", priorityScore: 1, booksIssued: 0 },
          { id: 204, memberId: "M004", name: "Prof. Alan Turing", department: "AI Research", contact: "9876543213", role: "Faculty", priorityScore: 3, booksIssued: 2 },
          { id: 205, memberId: "M005", name: "Elena Rostova", department: "Electronics Engg", contact: "9876543214", role: "Student", priorityScore: 1, booksIssued: 1 }
        ];

    const sampleStack = (window.initialReturnStack && window.initialReturnStack.length > 0)
      ? window.initialReturnStack
      : [
          { bookId: 104, bookTitle: "Clean Code", memberId: "M003", returnDate: "2026-10-07 10:15", fineAmount: 0 },
          { bookId: 107, bookTitle: "Computer Networks", memberId: "M005", returnDate: "2026-10-06 14:30", fineAmount: 10 }
        ];

    const sampleQueue = (window.initialWaitingList && window.initialWaitingList.length > 0)
      ? window.initialWaitingList
      : [
          { id: 1, bookId: 103, bookTitle: "Operating System Concepts", memberId: "M005", memberName: "Elena Rostova", role: "Student", priorityScore: 1 },
          { id: 2, bookId: 103, bookTitle: "Operating System Concepts", memberId: "M004", memberName: "Prof. Alan Turing", role: "Faculty", priorityScore: 3 },
          { id: 3, bookId: 106, bookTitle: "Artificial Intelligence: A Modern Approach", memberId: "M003", memberName: "David Miller", role: "Student", priorityScore: 1 }
        ];

    sampleBooks.forEach(b => booksSLL.insertAtEnd({ ...b }));
    sampleMembers.forEach(m => membersDLL.insertTail({ ...m }));
    sampleStack.forEach(r => returnStack.push({ ...r }));
    sampleQueue.forEach(w => waitingQueue.enqueue({ ...w }));

    // Populate Circular Queue sample
    circularQ.enqueue("Req-101 (CLRS)");
    circularQ.enqueue("Req-102 (OS)");
    circularQ.enqueue("Req-103 (AI)");

    // Populate Priority Queue sample
    priorityQ.enqueue("Student Request (Alex)", 1);
    priorityQ.enqueue("Faculty Request (Dr. Sarah)", 3);
    priorityQ.enqueue("Student Request (David)", 1);

    // Populate Deque sample
    dequeDS.insertRear("Item-1");
    dequeDS.insertRear("Item-2");
    dequeDS.insertFront("Front-Item");

    // Populate Sparse Matrix sample
    issueSparseMatrix.insert(0, 1, 14);
    issueSparseMatrix.insert(0, 2, 7);
    issueSparseMatrix.insert(1, 3, 10);
  }

  initData();

  // Navigation Sidebar Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = document.querySelectorAll('.tab-page');
  const pageTitleElem = document.getElementById('pageTitle');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      if (!targetTab) return;

      navItems.forEach(i => i.classList.remove('active'));
      tabPages.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const activePage = document.getElementById(targetTab);
      if (activePage) {
        activePage.classList.add('active');
        if (pageTitleElem) {
          const label = item.querySelector('span:not(.badge)');
          pageTitleElem.textContent = label ? label.textContent : 'Library Management';
        }
      }

      refreshView(targetTab);
    });
  });

  // Sub-Tabs Navigation (Queue Module)
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSub = btn.getAttribute('data-subtab');
      if (!targetSub) return;

      const parent = btn.closest('.tab-page');
      parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetElem = document.getElementById(targetSub);
      if (targetElem) targetElem.classList.add('active');

      if (targetSub === 'queue-circular') renderCircularQueueView();
      if (targetSub === 'queue-priority') renderPriorityQueueView();
      if (targetSub === 'queue-deque') renderDequeView();
    });
  });

  // Global Refresh Router
  function refreshView(tabId) {
    switch (tabId) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'book-management':
        renderBookTable();
        break;
      case 'member-management':
        renderMemberTable();
        break;
      case 'issue-system':
        renderIssueSystem();
        break;
      case 'queue-system':
        renderQueueVisualizer();
        break;
      case 'stack-system':
        renderStackVisualizer();
        break;
      case 'sll-operations':
        renderSLLVisualizer();
        break;
      case 'sparse-matrix':
        renderSparseMatrixDemo();
        break;
      case 'reports':
        renderReports();
        break;
    }
  }

  // ==========================================
  // MODULE 1: DASHBOARD
  // ==========================================
  function renderDashboard() {
    const books = booksSLL.traverse();
    const members = membersDLL.traverseForward();

    const totalBooksCount = books.length;
    let availableCount = 0;
    let issuedCount = 0;

    books.forEach(b => {
      availableCount += b.availableCopies;
      issuedCount += b.issuedCopies;
    });

    document.getElementById('dashTotalBooks').textContent = totalBooksCount;
    document.getElementById('dashAvailableBooks').textContent = availableCount;
    document.getElementById('dashIssuedBooks').textContent = issuedCount;
    document.getElementById('dashTotalMembers').textContent = members.length;
    document.getElementById('dashPendingQueue').textContent = waitingQueue.size();

    // Badges
    document.getElementById('badgeBooksCount').textContent = totalBooksCount;
    document.getElementById('badgeMembersCount').textContent = members.length;
    document.getElementById('badgeQueueCount').textContent = waitingQueue.size();
    document.getElementById('badgeStackCount').textContent = returnStack.size();

    // Recent Activity Table
    const recentTbody = document.getElementById('dashRecentActivityTbody');
    if (recentTbody) {
      recentTbody.innerHTML = activeIssuedRecords.slice(-5).map(r => `
        <tr>
          <td><strong>#${r.id}</strong></td>
          <td>${escapeHtml(r.bookTitle)}</td>
          <td>${escapeHtml(r.memberName)}</td>
          <td>${r.issueDate}</td>
          <td>${r.dueDate}</td>
          <td><span class="badge-status badge-issued">${r.status}</span></td>
        </tr>
      `).join('');
    }

    // Recent Books Table
    const recentBooksTbody = document.getElementById('dashRecentBooksTbody');
    if (recentBooksTbody) {
      recentBooksTbody.innerHTML = books.slice(-5).reverse().map(b => `
        <tr>
          <td><strong>#${b.id}</strong></td>
          <td>${escapeHtml(b.title)}</td>
          <td>${escapeHtml(b.author)}</td>
          <td><span class="tech-badge">${escapeHtml(b.category)}</span></td>
          <td>${b.availableCopies}/${b.totalCopies}</td>
        </tr>
      `).join('');
    }

    // Recent Members Table
    const recentMembersTbody = document.getElementById('dashRecentMembersTbody');
    if (recentMembersTbody) {
      recentMembersTbody.innerHTML = members.slice(-5).reverse().map(m => `
        <tr>
          <td><strong>${m.memberId}</strong></td>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.department)}</td>
          <td><span class="tech-badge">${m.role}</span></td>
        </tr>
      `).join('');
    }
  }

  // ==========================================
  // MODULE 2: BOOK MANAGEMENT (SLL)
  // ==========================================
  function renderBookTable(filterList = null) {
    const books = filterList || booksSLL.traverse();
    const tbody = document.getElementById('booksTableBody');
    if (!tbody) return;

    if (books.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No book records found in Linked List.</td></tr>`;
      return;
    }

    tbody.innerHTML = books.map(b => `
      <tr>
        <td><strong>#${b.id}</strong></td>
        <td><strong>${escapeHtml(b.title)}</strong></td>
        <td>${escapeHtml(b.author)}</td>
        <td><span class="tech-badge">${escapeHtml(b.category)}</span></td>
        <td>${b.availableCopies} / ${b.totalCopies}</td>
        <td>
          <span class="badge-status ${b.availableCopies > 0 ? 'badge-available' : 'badge-issued'}">
            ${b.availableCopies > 0 ? 'Available' : 'Out of Stock'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-secondary edit-book-btn" data-id="${b.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-book-btn" data-id="${b.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    // Attach Action Listeners
    document.querySelectorAll('.delete-book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm(`Delete Book #${id} from Singly Linked List?`)) {
          booksSLL.deleteByKey(id, 'id');
          renderBookTable();
          renderDashboard();
        }
      });
    });

    document.querySelectorAll('.edit-book-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const res = booksSLL.search(id, 'id');
        if (res) openBookModal(res.node.data);
      });
    });
  }

  // Modal Handlers
  const addBookBtn = document.getElementById('openAddBookModalBtn');
  const bookModal = document.getElementById('bookModal');
  const bookForm = document.getElementById('bookForm');

  if (addBookBtn) {
    addBookBtn.addEventListener('click', () => openBookModal(null));
  }

  function openBookModal(book = null) {
    if (!bookModal) return;
    document.getElementById('modalBookTitle').textContent = book ? 'Update Book Record' : 'Add New Book';
    document.getElementById('bookIdInput').value = book ? book.id : (100 + booksSLL.size + 1);
    document.getElementById('bookIdInput').readOnly = !!book;
    document.getElementById('bookTitleInput').value = book ? book.title : '';
    document.getElementById('bookAuthorInput').value = book ? book.author : '';
    document.getElementById('bookCategoryInput').value = book ? book.category : 'Computer Engg';
    document.getElementById('bookTotalCopiesInput').value = book ? book.totalCopies : 3;

    bookModal.classList.add('show');
  }

  const closeBookModalBtn = document.getElementById('closeBookModalBtn');
  if (closeBookModalBtn) {
    closeBookModalBtn.addEventListener('click', () => bookModal.classList.remove('show'));
  }

  if (bookForm) {
    bookForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = parseInt(document.getElementById('bookIdInput').value);
      const title = document.getElementById('bookTitleInput').value.trim();
      const author = document.getElementById('bookAuthorInput').value.trim();
      const category = document.getElementById('bookCategoryInput').value;
      const totalCopies = parseInt(document.getElementById('bookTotalCopiesInput').value);

      if (!title || !author) return;

      const existing = booksSLL.search(id, 'id');
      if (existing) {
        existing.node.data.title = title;
        existing.node.data.author = author;
        existing.node.data.category = category;
        const diff = totalCopies - existing.node.data.totalCopies;
        existing.node.data.totalCopies = totalCopies;
        existing.node.data.availableCopies = Math.max(0, existing.node.data.availableCopies + diff);
      } else {
        booksSLL.insertAtEnd({
          id,
          title,
          author,
          category,
          totalCopies,
          availableCopies: totalCopies,
          issuedCopies: 0,
          isAvailable: true
        });
      }

      bookModal.classList.remove('show');
      renderBookTable();
      renderDashboard();
      renderIssueSystem();
      populateQueueSelects();
      renderSLLVisualizer();
      alert(`Book "${title}" saved successfully!`);
    });
  }

  // Inline Add Book Form Handler
  const inlineAddBookForm = document.getElementById('inlineAddBookForm');
  if (inlineAddBookForm) {
    inlineAddBookForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('inlineBookTitleInput').value.trim();
      const author = document.getElementById('inlineBookAuthorInput').value.trim();
      const category = document.getElementById('inlineBookCategoryInput').value;
      const totalCopies = parseInt(document.getElementById('inlineBookCopiesInput').value) || 3;

      if (!title || !author) {
        alert("Please enter both Book Name and Author!");
        return;
      }

      const id = 100 + booksSLL.size + 1;
      booksSLL.insertAtEnd({
        id,
        title,
        author,
        category,
        totalCopies,
        availableCopies: totalCopies,
        issuedCopies: 0,
        isAvailable: true
      });

      inlineAddBookForm.reset();
      renderBookTable();
      renderDashboard();
      renderIssueSystem();
      populateQueueSelects();
      renderSLLVisualizer();
      showGlobalAlert(`✔ Success: Book "${title}" (#${id}) added successfully to Singly Linked List!`);
      alert(`Book "${title}" (ID: #${id}) added successfully!`);
    });
  }

  // Search & Quick Sort Controls
  const bookSearchInput = document.getElementById('bookSearchInput');
  if (bookSearchInput) {
    bookSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const allBooks = booksSLL.traverse();
      const filtered = allBooks.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) || 
        b.category.toLowerCase().includes(q) || 
        b.id.toString().includes(q)
      );
      renderBookTable(filtered);
    });
  }

  const bookQuickSortSelect = document.getElementById('bookQuickSortSelect');
  if (bookQuickSortSelect) {
    bookQuickSortSelect.addEventListener('change', (e) => {
      const sortBy = e.target.value;
      if (!sortBy) return;
      booksSLL.sort((a, b) => {
        if (typeof a[sortBy] === 'string') return a[sortBy].localeCompare(b[sortBy]);
        return a[sortBy] - b[sortBy];
      });
      renderBookTable();
    });
  }

  // ==========================================
  // MODULE 3: MEMBER MANAGEMENT (DLL)
  // ==========================================
  function renderMemberTable() {
    const members = membersDLL.traverseForward();
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    if (members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No members in Doubly Linked List.</td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(m => `
      <tr>
        <td><strong>${m.memberId}</strong></td>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td>${escapeHtml(m.department)}</td>
        <td>${escapeHtml(m.contact)}</td>
        <td><span class="tech-badge">${m.role}</span></td>
        <td>${m.booksIssued} books</td>
        <td>
          <button class="btn btn-sm btn-danger delete-member-btn" data-id="${m.memberId}">Delete</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.delete-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memId = btn.getAttribute('data-id');
        if (confirm(`Delete Member ${memId} from Doubly Linked List?`)) {
          const node = membersDLL.search(memId, 'memberId');
          if (node) membersDLL.deleteNode(node);
          renderMemberTable();
          renderDashboard();
          renderIssueSystem();
          populateQueueSelects();
        }
      });
    });
  }

  const addMemberForm = document.getElementById('addMemberForm');
  if (addMemberForm) {
    addMemberForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('memberNameInput').value.trim();
      const department = document.getElementById('memberDeptInput').value.trim();
      const contact = document.getElementById('memberContactInput').value.trim();
      const role = document.getElementById('memberRoleInput').value;

      if (!name || !department) {
        alert("Please enter both Full Name and Department!");
        return;
      }

      const newId = `M00${membersDLL.size + 1}`;
      const priorityScore = role === 'Faculty' ? 3 : 1;

      membersDLL.insertTail({
        id: 200 + membersDLL.size + 1,
        memberId: newId,
        name,
        department,
        contact: contact || "9876543210",
        role,
        priorityScore,
        booksIssued: 0
      });

      addMemberForm.reset();
      renderMemberTable();
      renderDashboard();
      renderIssueSystem();
      populateQueueSelects();
      showGlobalAlert(`✔ Success: Member "${name}" (${newId}) added successfully to Doubly Linked List!`);
      alert(`Member "${name}" (ID: ${newId}) added successfully!`);
    });
  }

  // ==========================================
  // MODULE 4: BOOK ISSUE & RETURN
  // ==========================================
  function renderIssueSystem() {
    const books = booksSLL.traverse();
    const members = membersDLL.traverseForward();

    const issueBookSelect = document.getElementById('issueBookSelect');
    const issueMemberSelect = document.getElementById('issueMemberSelect');

    if (issueBookSelect) {
      issueBookSelect.innerHTML = books.map(b => `
        <option value="${b.id}" ${b.availableCopies === 0 ? 'disabled' : ''}>
          #${b.id} - ${b.title} (${b.availableCopies} available)
        </option>
      `).join('');
    }

    if (issueMemberSelect) {
      issueMemberSelect.innerHTML = members.map(m => `
        <option value="${m.memberId}">${m.memberId} - ${m.name} (${m.role})</option>
      `).join('');
    }

    const returnSelect = document.getElementById('returnRecordSelect');
    if (returnSelect) {
      returnSelect.innerHTML = activeIssuedRecords.map(r => `
        <option value="${r.id}">Record #${r.id}: ${r.memberName} - "${r.bookTitle}"</option>
      `).join('');
    }

    const tbody = document.getElementById('activeIssuedTableBody');
    if (tbody) {
      tbody.innerHTML = activeIssuedRecords.map(r => `
        <tr>
          <td><strong>#${r.id}</strong></td>
          <td>${escapeHtml(r.bookTitle)}</td>
          <td>${escapeHtml(r.memberName)}</td>
          <td>${r.issueDate}</td>
          <td>${r.dueDate}</td>
          <td><span class="badge-status badge-issued">${r.status}</span></td>
        </tr>
      `).join('');
    }
  }

  const issueForm = document.getElementById('issueBookForm');
  if (issueForm) {
    issueForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const bookId = parseInt(document.getElementById('issueBookSelect').value);
      const memberId = document.getElementById('issueMemberSelect').value;

      const bookRes = booksSLL.search(bookId, 'id');
      const memberNode = membersDLL.search(memberId, 'memberId');

      if (!bookRes || bookRes.node.data.availableCopies <= 0 || !memberNode) return;

      bookRes.node.data.availableCopies--;
      bookRes.node.data.issuedCopies++;
      memberNode.data.booksIssued++;

      const newRecord = {
        id: activeIssuedRecords.length + 1,
        bookId: bookRes.node.data.id,
        memberId: memberNode.data.memberId,
        memberName: memberNode.data.name,
        bookTitle: bookRes.node.data.title,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: "Active"
      };

      activeIssuedRecords.push(newRecord);
      alert(`Issued "${bookRes.node.data.title}" to ${memberNode.data.name}! Record #${newRecord.id} created.`);
      renderIssueSystem();
      renderDashboard();
    });
  }

  const returnForm = document.getElementById('returnBookForm');
  if (returnForm) {
    returnForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const recordId = parseInt(document.getElementById('returnRecordSelect').value);
      const daysOverdue = parseInt(document.getElementById('daysOverdueInput').value || 0);

      const idx = activeIssuedRecords.findIndex(r => r.id === recordId);
      if (idx === -1) return;

      const record = activeIssuedRecords[idx];
      const dpResult = AlgorithmicParadigms.dynamicProgrammingLateFine(daysOverdue);

      const bookRes = booksSLL.search(record.bookId, 'id');
      if (bookRes) {
        bookRes.node.data.availableCopies++;
        bookRes.node.data.issuedCopies--;
      }

      returnStack.push({
        bookId: record.bookId,
        bookTitle: record.bookTitle,
        memberId: record.memberId,
        returnDate: new Date().toLocaleString(),
        fineAmount: dpResult.totalFine
      });

      activeIssuedRecords.splice(idx, 1);
      alert(`Returned "${record.bookTitle}". Fine: $${dpResult.totalFine}. Record pushed to Stack.`);
      renderIssueSystem();
      renderDashboard();
    });
  }

  // ==========================================
  // MODULE 5: LINKED LIST DEMONSTRATION
  // ==========================================
  function renderSLLVisualizer() {
    const container = document.getElementById('sllVisualizerNodes');
    if (!container) return;

    const list = booksSLL.traverse();
    if (list.length === 0) {
      container.innerHTML = `<span style="color:#64748b;">HEAD ➔ NULL (Empty Linked List)</span>`;
      return;
    }

    let html = `<div class="visual-nodes-container"><span style="color:#2563eb; font-weight:700;">HEAD ➔</span>`;
    list.forEach(b => {
      html += `
        <div class="node-box">
          <div class="node-data">#${b.id} ${escapeHtml(b.title.substring(0, 10))}</div>
          <div class="node-ptr">next</div>
        </div>
        <span class="node-arrow">➔</span>
      `;
    });
    html += `<span style="color:#ef4444; font-weight:700;">NULL</span></div>`;
    container.innerHTML = html;

    // Secondary SLL
    const secContainer = document.getElementById('secondarySLLNodes');
    if (secContainer) {
      const secList = secondarySLL.traverse();
      let secHtml = `<div class="visual-nodes-container"><span style="color:#f59e0b; font-weight:700;">HEAD2 ➔</span>`;
      secList.forEach(b => {
        secHtml += `
          <div class="node-box" style="border-color:#f59e0b;">
            <div class="node-data" style="background:#fffbeb;">#${b.id} ${escapeHtml(b.title.substring(0, 10))}</div>
            <div class="node-ptr" style="background:#fef3c7;">next</div>
          </div>
          <span class="node-arrow">➔</span>
        `;
      });
      secHtml += `<span style="color:#ef4444; font-weight:700;">NULL</span></div>`;
      secContainer.innerHTML = secHtml;
    }
  }

  document.getElementById('sllInsertHeadBtn')?.addEventListener('click', () => {
    const val = prompt("Enter Book ID & Name (e.g. 501: Operating Systems)", "501: Operating Systems");
    if (!val) return;
    const parts = val.split(':');
    const id = parseInt(parts[0]) || 501;
    const title = parts[1] ? parts[1].trim() : "New Book";
    booksSLL.insertAtStart({ id, title, author: "Author", category: "Computer Engg", totalCopies: 2, availableCopies: 2, issuedCopies: 0 });
    renderSLLVisualizer();
    renderDashboard();
  });

  document.getElementById('sllInsertTailBtn')?.addEventListener('click', () => {
    const val = prompt("Enter Book ID & Name (e.g. 502: Networking Basics)", "502: Networking Basics");
    if (!val) return;
    const parts = val.split(':');
    const id = parseInt(parts[0]) || 502;
    const title = parts[1] ? parts[1].trim() : "Tail Book";
    booksSLL.insertAtEnd({ id, title, author: "Author", category: "Computer Engg", totalCopies: 3, availableCopies: 3, issuedCopies: 0 });
    renderSLLVisualizer();
    renderDashboard();
  });

  document.getElementById('sllDeleteHeadBtn')?.addEventListener('click', () => {
    const deleted = booksSLL.deleteFromStart();
    if (deleted) alert(`Deleted Head Node: #${deleted.id} - ${deleted.title}`);
    renderSLLVisualizer();
    renderDashboard();
  });

  document.getElementById('sllDeleteTailBtn')?.addEventListener('click', () => {
    const deleted = booksSLL.deleteFromEnd();
    if (deleted) alert(`Deleted Tail Node: #${deleted.id} - ${deleted.title}`);
    renderSLLVisualizer();
    renderDashboard();
  });

  document.getElementById('sllSortBtn')?.addEventListener('click', () => {
    booksSLL.sort((a, b) => a.id - b.id);
    alert("Sorted Linked List nodes by Book ID!");
    renderSLLVisualizer();
    renderDashboard();
  });

  document.getElementById('sllConcatBtn')?.addEventListener('click', () => {
    booksSLL.concatenate(secondarySLL);
    alert("Concatenated Secondary Linked List into Main List!");
    renderSLLVisualizer();
    renderDashboard();
  });

  // ==========================================
  // MODULE 6: STACK DEMONSTRATION
  // ==========================================
  function renderStackVisualizer() {
    const container = document.getElementById('stackVisualizerContainer');
    if (!container) return;

    const items = returnStack.display();
    if (items.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Stack is empty.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="text-align:center; font-size:0.8rem; color:#2563eb; margin-bottom:0.4rem; font-weight:700;">
        ↓ TOP OF STACK (LIFO) ↓
      </div>
      <div class="stack-visualizer">
        ${items.map((item, idx) => `
          <div class="stack-item" style="${idx === 0 ? 'border-color:#10b981; background:#ecfdf5;' : ''}">
            ${idx === 0 ? '<span style="color:#059669; font-weight:bold;">[TOP] </span>' : ''}
            "${escapeHtml(item.bookTitle)}" (Member: ${item.memberId})
          </div>
        `).join('')}
      </div>
    `;
  }

  document.getElementById('stackPopBtn')?.addEventListener('click', () => {
    const popped = returnStack.pop();
    if (!popped) alert("Stack Underflow! Stack is empty.");
    else alert(`Popped from Stack: "${popped.bookTitle}"`);
    renderStackVisualizer();
    renderDashboard();
  });

  document.getElementById('stackPeekBtn')?.addEventListener('click', () => {
    const top = returnStack.peek();
    if (!top) alert("Stack is empty.");
    else alert(`Top Element (Peek): "${top.bookTitle}" (Returned: ${top.returnDate})`);
  });

  // ==========================================
  // MODULE 7: QUEUE DEMONSTRATION
  // ==========================================
  function renderQueueVisualizer() {
    const container = document.getElementById('queueVisualizerContainer');
    if (!container) return;

    const items = waitingQueue.display();
    if (items.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Linear Queue is empty.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom:0.4rem; font-size:0.8rem; color:#64748b;">
        <strong>FRONT OF QUEUE</strong> ➔
      </div>
      <div class="queue-visualizer">
        ${items.map((item, idx) => `
          <div class="queue-item">
            <span class="queue-badge">${idx === 0 ? 'FRONT' : idx === items.length - 1 ? 'REAR' : `Pos ${idx + 1}`}</span>
            <div>${escapeHtml(item.memberName)}</div>
            <div style="font-size:0.7rem; color:#64748b;">"${escapeHtml(item.bookTitle.substring(0, 15))}..."</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  document.getElementById('enqueueBtn')?.addEventListener('click', () => {
    const qb = document.getElementById('queueBookSelect');
    const qm = document.getElementById('queueMemberSelect');
    if (!qb || !qm) return;

    const bookRes = booksSLL.search(parseInt(qb.value), 'id');
    const memNode = membersDLL.search(qm.value, 'memberId');

    if (!bookRes || !memNode) return;

    waitingQueue.enqueue({
      id: Date.now(),
      bookId: bookRes.node.data.id,
      bookTitle: bookRes.node.data.title,
      memberId: memNode.data.memberId,
      memberName: memNode.data.name,
      role: memNode.data.role
    });

    renderQueueVisualizer();
    renderDashboard();
  });

  document.getElementById('dequeueBtn')?.addEventListener('click', () => {
    const served = waitingQueue.dequeue();
    if (!served) alert("Queue Underflow! Queue is empty.");
    else alert(`Dequeued from Queue: ${served.memberName} for "${served.bookTitle}"`);
    renderQueueVisualizer();
    renderDashboard();
  });

  document.getElementById('queueFrontBtn')?.addEventListener('click', () => {
    const f = waitingQueue.front();
    if (!f) alert("Queue is empty.");
    else alert(`Front Element: ${f.memberName} ("${f.bookTitle}")`);
  });

  document.getElementById('queueRearBtn')?.addEventListener('click', () => {
    const r = waitingQueue.rear();
    if (!r) alert("Queue is empty.");
    else alert(`Rear Element: ${r.memberName} ("${r.bookTitle}")`);
  });

  // Circular Queue View
  function renderCircularQueueView() {
    const container = document.getElementById('circularQueueVisualizer');
    if (!container) return;

    const state = circularQ.display();
    let html = `<div style="display:flex; gap:0.5rem; justify-content:center; align-items:center; padding:1rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px;">`;

    state.items.forEach((val, idx) => {
      const isFront = idx === state.front;
      const isRear = idx === state.rear;
      html += `
        <div style="border:2px solid ${isFront ? '#10b981' : isRear ? '#2563eb' : '#cbd5e1'}; background:${val ? '#fff' : '#f1f5f9'}; padding:0.75rem; border-radius:6px; min-width:80px; text-align:center;">
          <div style="font-size:0.7rem; color:#64748b;">Slot ${idx}</div>
          <div style="font-weight:bold; color:${val ? '#0f172a' : '#cbd5e1'}; margin:0.2rem 0;">${val ? val : 'Empty'}</div>
          ${isFront ? '<span style="background:#d1fae5; color:#065f46; font-size:0.65rem; padding:0.1rem 0.3rem; border-radius:4px; font-weight:bold;">FRONT</span>' : ''}
          ${isRear ? '<span style="background:#dbeafe; color:#1e40af; font-size:0.65rem; padding:0.1rem 0.3rem; border-radius:4px; font-weight:bold;">REAR</span>' : ''}
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  document.getElementById('circEnqueueBtn')?.addEventListener('click', () => {
    const val = document.getElementById('circValInput').value.trim() || `Req-${Math.floor(Math.random()*90)+10}`;
    const success = circularQ.enqueue(val);
    if (!success) alert("Circular Queue Overflow! Capacity (5) reached.");
    renderCircularQueueView();
  });

  document.getElementById('circDequeueBtn')?.addEventListener('click', () => {
    const item = circularQ.dequeue();
    if (!item) alert("Circular Queue Underflow! Queue is empty.");
    else alert(`Dequeued: ${item}`);
    renderCircularQueueView();
  });

  // Priority Queue View
  function renderPriorityQueueView() {
    document.getElementById('runPriorityQueueDemoBtn')?.addEventListener('click', () => {
      const items = priorityQ.display();
      const logBox = document.getElementById('priorityQueueLogBox');
      if (logBox) {
        logBox.innerHTML = items.map((item, idx) => 
          `<div class="log-step">Pos ${idx + 1}: ${item.data} (Priority Score: ${item.priority})</div>`
        ).join('');
      }
    });
  }

  // Deque View
  function renderDequeView() {
    const container = document.getElementById('dequeVisualizerContainer');
    if (!container) return;

    const items = dequeDS.display();
    container.innerHTML = `
      <div style="display:flex; gap:0.5rem; justify-content:center; align-items:center; padding:1rem; background:#f8fafc; border:1px dashed #2563eb; border-radius:6px;">
        <span style="font-weight:bold; color:#2563eb;">FRONT ➔</span>
        ${items.map(val => `<div style="background:#fff; border:1px solid #2563eb; padding:0.5rem 0.75rem; border-radius:4px; font-weight:600;">${val}</div>`).join('')}
        <span style="font-weight:bold; color:#2563eb;">➔ REAR</span>
      </div>
    `;
  }

  document.getElementById('dequeInsertFrontBtn')?.addEventListener('click', () => {
    dequeDS.insertFront(`Front-${Math.floor(Math.random()*50)}`);
    renderDequeView();
  });

  document.getElementById('dequeInsertRearBtn')?.addEventListener('click', () => {
    dequeDS.insertRear(`Rear-${Math.floor(Math.random()*50)}`);
    renderDequeView();
  });

  document.getElementById('dequeDeleteFrontBtn')?.addEventListener('click', () => {
    const item = dequeDS.deleteFront();
    if (!item) alert("Deque is empty.");
    renderDequeView();
  });

  document.getElementById('dequeDeleteRearBtn')?.addEventListener('click', () => {
    const item = dequeDS.deleteRear();
    if (!item) alert("Deque is empty.");
    renderDequeView();
  });

  // Populate Queue Select Dropdowns
  function populateQueueSelects() {
    const books = booksSLL.traverse();
    const members = membersDLL.traverseForward();
    const qb = document.getElementById('queueBookSelect');
    const qm = document.getElementById('queueMemberSelect');
    if (qb) qb.innerHTML = books.map(b => `<option value="${b.id}">#${b.id} - ${b.title}</option>`).join('');
    if (qm) qm.innerHTML = members.map(m => `<option value="${m.memberId}">${m.memberId} - ${m.name}</option>`).join('');
  }

  // ==========================================
  // MODULE 8: SPARSE MATRIX DEMO
  // ==========================================
  function renderSparseMatrixDemo() {
    const container = document.getElementById('sparseMatrixDemoContainer');
    if (!container) return;

    const dense = issueSparseMatrix.toDenseMatrix();
    let html = `
      <p style="font-size:0.83rem; color:var(--text-muted); margin-bottom:0.5rem;">
        Dense Matrix (Original Grid) & Sparsity: ${issueSparseMatrix.getSparsity()}% (Non-zero elements: ${issueSparseMatrix.getNonZeroCount()})
      </p>
      <table class="sparse-matrix-table">
        <thead><tr><th>Row \\ Col</th>
    `;
    for (let c = 0; c < issueSparseMatrix.cols; c++) html += `<th>Col ${c}</th>`;
    html += `</tr></thead><tbody>`;

    for (let r = 0; r < issueSparseMatrix.rows; r++) {
      html += `<tr><th>Row ${r}</th>`;
      for (let c = 0; c < issueSparseMatrix.cols; c++) {
        const val = dense[r][c];
        if (val > 0) html += `<td class="active-cell">${val}</td>`;
        else html += `<td class="zero-cell">0</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;

    html += `
      <h4 style="margin-top:1rem; margin-bottom:0.4rem; font-size:0.9rem;">3-Tuple Representation Table (Row, Column, Value):</h4>
      <table class="data-table" style="max-width:350px;">
        <thead><tr><th>Row Index</th><th>Column Index</th><th>Value</th></tr></thead>
        <tbody>
          ${issueSparseMatrix.triplets.map(t => `<tr><td>${t.row}</td><td>${t.col}</td><td><strong>${t.value}</strong></td></tr>`).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  // ==========================================
  // MODULE 9: SEARCHING WORKBENCH
  // ==========================================
  document.getElementById('runSearchBtn')?.addEventListener('click', () => {
    const algo = document.getElementById('searchAlgoSelect').value;
    const targetKey = parseInt(document.getElementById('searchKeyInput').value);

    if (isNaN(targetKey)) {
      alert("Please enter a valid numeric Book ID!");
      return;
    }

    const searchData = booksSLL.traverse();
    let result = null;

    switch (algo) {
      case 'linear':
        result = SearchingAlgorithms.linearSearch(searchData, targetKey, 'id');
        break;
      case 'sentinel':
        result = SearchingAlgorithms.sentinelSearch(searchData, targetKey, 'id');
        break;
      case 'binary':
        result = SearchingAlgorithms.binarySearch(searchData, targetKey, 'id');
        break;
      case 'indexed':
        result = SearchingAlgorithms.indexedSequentialSearch(searchData, targetKey, 'id', 3);
        break;
      case 'fibonacci':
        result = SearchingAlgorithms.fibonacciSearch(searchData, targetKey, 'id');
        break;
    }

    document.getElementById('searchResStatus').innerHTML = result.found 
      ? `<span style="color:#059669;">FOUND ("${result.item.title}")</span>`
      : result.isUnsortedWarning 
      ? `<span style="color:#dc2626;">UNSORTED DATA WARNING</span>`
      : `<span style="color:#dc2626;">NOT FOUND</span>`;

    document.getElementById('searchResComparisons').textContent = result.comparisons;
    document.getElementById('searchResTime').textContent = `${result.timeTakenMs} ms`;
    document.getElementById('searchResComplexity').textContent = result.complexity;

    const logBox = document.getElementById('searchLogBox');
    logBox.innerHTML = result.steps.map(s => {
      let cls = 'log-step';
      if (s.includes('found') || s.includes('Target found')) cls += ' found';
      else if (s.includes('WARNING')) cls += ' warning';
      else if (s.includes('Checking') || s.includes('Range')) cls += ' highlight';
      return `<div class="${cls}">${s}</div>`;
    }).join('');
  });

  // ==========================================
  // MODULE 10: SORTING WORKBENCH
  // ==========================================
  document.getElementById('runSortBtn')?.addEventListener('click', () => {
    const algo = document.getElementById('sortAlgoSelect').value;
    const keyProp = document.getElementById('sortKeyPropSelect').value;
    const originalData = booksSLL.traverse();

    document.getElementById('sortBeforeBox').textContent = originalData.map(b => `${b[keyProp]} (${b.title.substring(0, 10)})`).join(' | ');

    let result = null;
    switch (algo) {
      case 'bubble':
        result = SortingAlgorithms.bubbleSort(originalData, keyProp, true);
        break;
      case 'selection':
        result = SortingAlgorithms.selectionSort(originalData, keyProp, true);
        break;
      case 'insertion':
        result = SortingAlgorithms.insertionSort(originalData, keyProp, true);
        break;
      case 'quick':
        result = SortingAlgorithms.quickSort(originalData, keyProp, true);
        break;
      case 'shell':
        result = SortingAlgorithms.shellSort(originalData, keyProp, true);
        break;
    }

    document.getElementById('sortAfterBox').textContent = result.sortedArray.map(b => `${b[keyProp]} (${b.title.substring(0, 10)})`).join(' | ');
    document.getElementById('sortResComparisons').textContent = result.comparisons;
    document.getElementById('sortResSwaps').textContent = result.swaps;
    document.getElementById('sortResTime').textContent = `${result.timeTakenMs} ms`;
    document.getElementById('sortResComplexity').textContent = result.complexity;

    const logBox = document.getElementById('sortLogBox');
    logBox.innerHTML = result.steps.map(s => `<div class="log-step">${s}</div>`).join('');
  });

  // Initial Pre-Render for All Views
  populateQueueSelects();
  renderDashboard();
  renderBookTable();
  renderMemberTable();
  renderIssueSystem();
  renderQueueVisualizer();
  renderStackVisualizer();
  renderSLLVisualizer();
  renderSparseMatrixDemo();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
