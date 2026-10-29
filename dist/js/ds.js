/**
 * Data Structures Implementation for Smart Library Management System
 * College Academic Mini Project - Computer Engineering (DSA Syllabus)
 * 
 * Data Structures Included:
 * 1. Singly Linked List (SLL)
 * 2. Doubly Linked List (DLL)
 * 3. Stack (LIFO - Array-based)
 * 4. Linear Queue (FIFO - Array-based)
 * 5. Circular Queue
 * 6. Priority Queue (Ascending & Descending)
 * 7. Deque (Double Ended Queue - Input/Output Restricted)
 * 8. Sparse Matrix (3-Tuple Representation)
 */

// ==========================================
// 1. SINGLY LINKED LIST (SLL)
// ==========================================
class SLLNode {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

class SinglyLinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  // Insert at Start - O(1)
  insertAtStart(data) {
    const newNode = new SLLNode(data);
    newNode.next = this.head;
    this.head = newNode;
    this.size++;
    return newNode;
  }

  // Insert at End - O(n)
  insertAtEnd(data) {
    const newNode = new SLLNode(data);
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next !== null) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
    return newNode;
  }

  // Insert at specific position (1-indexed) - O(n)
  insertAtPosition(data, position) {
    if (position < 1 || position > this.size + 1) {
      throw new Error(`Invalid position ${position}. Valid range: 1 to ${this.size + 1}`);
    }
    if (position === 1) return this.insertAtStart(data);

    const newNode = new SLLNode(data);
    let current = this.head;
    for (let i = 1; i < position - 1; i++) {
      current = current.next;
    }
    newNode.next = current.next;
    current.next = newNode;
    this.size++;
    return newNode;
  }

  // Delete from Start - O(1)
  deleteFromStart() {
    if (!this.head) return null;
    const deleted = this.head;
    this.head = this.head.next;
    this.size--;
    return deleted.data;
  }

  // Delete from End - O(n)
  deleteFromEnd() {
    if (!this.head) return null;
    if (!this.head.next) {
      const data = this.head.data;
      this.head = null;
      this.size--;
      return data;
    }
    let current = this.head;
    while (current.next.next !== null) {
      current = current.next;
    }
    const data = current.next.data;
    current.next = null;
    this.size--;
    return data;
  }

  // Delete by key match - O(n)
  deleteByKey(key, keyName = 'id') {
    if (!this.head) return false;
    if (this.head.data[keyName] == key) {
      this.head = this.head.next;
      this.size--;
      return true;
    }
    let current = this.head;
    while (current.next && current.next.data[keyName] != key) {
      current = current.next;
    }
    if (current.next) {
      current.next = current.next.next;
      this.size--;
      return true;
    }
    return false;
  }

  // Search element - O(n)
  search(key, keyName = 'id') {
    let current = this.head;
    let pos = 1;
    while (current !== null) {
      if (current.data[keyName] == key || current.data == key) {
        return { node: current, position: pos };
      }
      current = current.next;
      pos++;
    }
    return null;
  }

  // Traverse list into Array - O(n)
  traverse() {
    const result = [];
    let current = this.head;
    while (current !== null) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  }

  // Sort Linked List using Bubble Sort - O(n^2)
  sort(compareFn) {
    if (!this.head || !this.head.next) return;
    let swapped;
    do {
      swapped = false;
      let current = this.head;
      while (current.next !== null) {
        if (compareFn(current.data, current.next.data) > 0) {
          const temp = current.data;
          current.data = current.next.data;
          current.next.data = temp;
          swapped = true;
        }
        current = current.next;
      }
    } while (swapped);
  }

  // Concatenate another SinglyLinkedList - O(n)
  concatenate(otherList) {
    if (!otherList || !otherList.head) return;
    if (!this.head) {
      this.head = otherList.head;
      this.size = otherList.size;
      return;
    }
    let current = this.head;
    while (current.next !== null) {
      current = current.next;
    }
    current.next = otherList.head;
    this.size += otherList.size;
  }
}

// ==========================================
// 2. DOUBLY LINKED LIST (DLL)
// ==========================================
class DLLNode {
  constructor(data) {
    this.data = data;
    this.prev = null;
    this.next = null;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  insertHead(data) {
    const newNode = new DLLNode(data);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    }
    this.size++;
    return newNode;
  }

  insertTail(data) {
    const newNode = new DLLNode(data);
    if (!this.tail) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.prev = this.tail;
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.size++;
    return newNode;
  }

  deleteNode(node) {
    if (!node) return null;
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    this.size--;
    return node.data;
  }

  search(key, keyName = 'memberId') {
    let current = this.head;
    while (current) {
      if (current.data[keyName] == key) return current;
      current = current.next;
    }
    return null;
  }

  traverseForward() {
    const arr = [];
    let current = this.head;
    while (current) {
      arr.push(current.data);
      current = current.next;
    }
    return arr;
  }

  traverseBackward() {
    const arr = [];
    let current = this.tail;
    while (current) {
      arr.push(current.data);
      current = current.prev;
    }
    return arr;
  }
}

// ==========================================
// 3. STACK (LIFO - Sequential Organization)
// ==========================================
class Stack {
  constructor(capacity = 20) {
    this.items = [];
    this.capacity = capacity;
  }

  push(element) {
    if (this.isFull()) throw new Error("Stack Overflow!");
    this.items.push(element);
    return true;
  }

  pop() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  isFull() {
    return this.items.length >= this.capacity;
  }

  size() {
    return this.items.length;
  }

  display() {
    return [...this.items].reverse(); // top element first
  }
}

// ==========================================
// 4. LINEAR QUEUE (FIFO - Sequential Organization)
// ==========================================
class Queue {
  constructor(capacity = 20) {
    this.items = [];
    this.capacity = capacity;
  }

  enqueue(element) {
    if (this.isFull()) throw new Error("Queue Overflow!");
    this.items.push(element);
    return true;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this.items.shift();
  }

  front() {
    if (this.isEmpty()) return null;
    return this.items[0];
  }

  rear() {
    if (this.isEmpty()) return null;
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  isFull() {
    return this.items.length >= this.capacity;
  }

  size() {
    return this.items.length;
  }

  display() {
    return [...this.items];
  }
}

// ==========================================
// 5. CIRCULAR QUEUE
// ==========================================
class CircularQueue {
  constructor(capacity = 5) {
    this.capacity = capacity;
    this.items = new Array(capacity).fill(null);
    this.frontPtr = -1;
    this.rearPtr = -1;
    this.count = 0;
  }

  enqueue(element) {
    if (this.isFull()) return false;
    if (this.isEmpty()) {
      this.frontPtr = 0;
      this.rearPtr = 0;
    } else {
      this.rearPtr = (this.rearPtr + 1) % this.capacity;
    }
    this.items[this.rearPtr] = element;
    this.count++;
    return true;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const item = this.items[this.frontPtr];
    this.items[this.frontPtr] = null;
    if (this.frontPtr === this.rearPtr) {
      this.frontPtr = -1;
      this.rearPtr = -1;
    } else {
      this.frontPtr = (this.frontPtr + 1) % this.capacity;
    }
    this.count--;
    return item;
  }

  isFull() {
    return this.count === this.capacity;
  }

  isEmpty() {
    return this.count === 0;
  }

  display() {
    return {
      items: [...this.items],
      front: this.frontPtr,
      rear: this.rearPtr,
      count: this.count
    };
  }
}

// ==========================================
// 6. PRIORITY QUEUE (Ascending & Descending)
// ==========================================
class PriorityQueue {
  constructor(isAscending = true) {
    this.items = [];
    this.isAscending = isAscending; // true = lowest priority number first, false = highest first
  }

  enqueue(data, priority) {
    const element = { data, priority };
    if (this.isEmpty()) {
      this.items.push(element);
    } else {
      let added = false;
      for (let i = 0; i < this.items.length; i++) {
        const condition = this.isAscending 
          ? priority < this.items[i].priority 
          : priority > this.items[i].priority;

        if (condition) {
          this.items.splice(i, 0, element);
          added = true;
          break;
        }
      }
      if (!added) this.items.push(element);
    }
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  display() {
    return [...this.items];
  }
}

// ==========================================
// 7. DEQUE (Double Ended Queue)
// ==========================================
class Deque {
  constructor(capacity = 10) {
    this.items = [];
    this.capacity = capacity;
  }

  insertFront(element) {
    if (this.items.length >= this.capacity) return false;
    this.items.unshift(element);
    return true;
  }

  insertRear(element) {
    if (this.items.length >= this.capacity) return false;
    this.items.push(element);
    return true;
  }

  deleteFront() {
    if (this.isEmpty()) return null;
    return this.items.shift();
  }

  deleteRear() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  display() {
    return [...this.items];
  }
}

// ==========================================
// 8. SPARSE MATRIX (3-Tuple Representation)
// ==========================================
class SparseMatrix {
  constructor(rows = 3, cols = 3) {
    this.rows = rows;
    this.cols = cols;
    this.triplets = [];
  }

  setMatrix(dense2D) {
    this.rows = dense2D.length;
    this.cols = dense2D[0] ? dense2D[0].length : 0;
    this.triplets = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (dense2D[r][c] !== 0) {
          this.triplets.push({ row: r, col: c, value: dense2D[r][c] });
        }
      }
    }
  }

  insert(row, col, value) {
    this.triplets = this.triplets.filter(t => !(t.row === row && t.col === col));
    if (value !== 0) {
      this.triplets.push({ row, col, value });
    }
  }

  toDenseMatrix() {
    const dense = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    for (const t of this.triplets) {
      if (t.row < this.rows && t.col < this.cols) {
        dense[t.row][t.col] = t.value;
      }
    }
    return dense;
  }

  getNonZeroCount() {
    return this.triplets.length;
  }

  getSparsity() {
    const total = this.rows * this.cols;
    if (total === 0) return 0;
    const zeros = total - this.triplets.length;
    return ((zeros / total) * 100).toFixed(1);
  }
}

// Export for global browser scope
window.SinglyLinkedList = SinglyLinkedList;
window.DoublyLinkedList = DoublyLinkedList;
window.Stack = Stack;
window.Queue = Queue;
window.CircularQueue = CircularQueue;
window.PriorityQueue = PriorityQueue;
window.Deque = Deque;
window.SparseMatrix = SparseMatrix;
