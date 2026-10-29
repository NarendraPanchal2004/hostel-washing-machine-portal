/**
 * Sample Initial Data for Smart Library Management System
 * College Academic Mini Project - Computer Engineering (DSA Syllabus)
 */

window.initialSampleBooks = [
  { id: 101, title: "Data Structures & Algorithms in C++", author: "Mark Allen Weiss", category: "Computer Engg", totalCopies: 5, availableCopies: 3, issuedCopies: 2, isAvailable: true },
  { id: 102, title: "Introduction to Algorithms (CLRS)", author: "Cormen, Leiserson, Rivest", category: "Algorithms", totalCopies: 4, availableCopies: 1, issuedCopies: 3, isAvailable: true },
  { id: 103, title: "Operating System Concepts", author: "Silberschatz & Galvin", category: "Computer Engg", totalCopies: 3, availableCopies: 0, issuedCopies: 3, isAvailable: false },
  { id: 104, title: "Clean Code", author: "Robert C. Martin", category: "Software Engg", totalCopies: 6, availableCopies: 4, issuedCopies: 2, isAvailable: true },
  { id: 105, title: "Database System Concepts", author: "Korth & Sudarshan", category: "Databases", totalCopies: 4, availableCopies: 2, issuedCopies: 2, isAvailable: true },
  { id: 106, title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell & Peter Norvig", category: "AI & ML", totalCopies: 2, availableCopies: 0, issuedCopies: 2, isAvailable: false },
  { id: 107, title: "Computer Networks", author: "Andrew S. Tanenbaum", category: "Networking", totalCopies: 5, availableCopies: 5, issuedCopies: 0, isAvailable: true },
  { id: 108, title: "Discrete Mathematics and Its Applications", author: "Kenneth H. Rosen", category: "Mathematics", totalCopies: 3, availableCopies: 2, issuedCopies: 1, isAvailable: true }
];

window.initialSampleMembers = [
  { id: 201, memberId: "M001", name: "Alex Mercer", department: "Computer Engg", contact: "9876543210", role: "Student", priorityScore: 1, booksIssued: 2 },
  { id: 202, memberId: "M002", name: "Dr. Sarah Connor", department: "Computer Engg", contact: "9876543211", role: "Faculty", priorityScore: 3, booksIssued: 1 },
  { id: 203, memberId: "M003", name: "David Miller", department: "Information Tech", contact: "9876543212", role: "Student", priorityScore: 1, booksIssued: 0 },
  { id: 204, memberId: "M004", name: "Prof. Alan Turing", department: "AI Research", contact: "9876543213", role: "Faculty", priorityScore: 3, booksIssued: 2 },
  { id: 205, memberId: "M005", name: "Elena Rostova", department: "Electronics Engg", contact: "9876543214", role: "Student", priorityScore: 1, booksIssued: 1 }
];

window.initialIssuedRecords = [
  { id: 1, bookId: 101, memberId: "M001", memberName: "Alex Mercer", bookTitle: "Data Structures & Algorithms in C++", issueDate: "2026-10-01", dueDate: "2026-10-15", status: "Active" },
  { id: 2, bookId: 102, memberId: "M001", memberName: "Alex Mercer", bookTitle: "Introduction to Algorithms (CLRS)", issueDate: "2026-09-25", dueDate: "2026-10-09", status: "Active" },
  { id: 3, bookId: 103, memberId: "M002", memberName: "Dr. Sarah Connor", bookTitle: "Operating System Concepts", issueDate: "2026-10-02", dueDate: "2026-10-16", status: "Active" }
];

window.initialWaitingList = [
  { id: 1, bookId: 103, bookTitle: "Operating System Concepts", memberId: "M005", memberName: "Elena Rostova", role: "Student", priorityScore: 1 },
  { id: 2, bookId: 103, bookTitle: "Operating System Concepts", memberId: "M004", memberName: "Prof. Alan Turing", role: "Faculty", priorityScore: 3 },
  { id: 3, bookId: 106, bookTitle: "Artificial Intelligence: A Modern Approach", memberId: "M003", memberName: "David Miller", role: "Student", priorityScore: 1 }
];

window.initialReturnStack = [
  { bookId: 104, bookTitle: "Clean Code", memberId: "M003", returnDate: "2026-10-07 10:15", fineAmount: 0 },
  { bookId: 107, bookTitle: "Computer Networks", memberId: "M005", returnDate: "2026-10-06 14:30", fineAmount: 10 }
];
