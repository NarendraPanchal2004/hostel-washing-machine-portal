/**
 * Algorithms Implementation for Smart Library Management System
 * College Academic Mini Project - Computer Engineering (DSA Syllabus)
 * 
 * Implementations included:
 * 1. Searching Algorithms (Linear, Sentinel, Binary, Indexed Sequential, Fibonacci)
 * 2. Sorting Algorithms (Bubble, Selection, Insertion, Quick, Shell)
 * 3. Algorithmic Paradigms (Divide & Conquer, Greedy Strategy, Dynamic Programming)
 */

// ==========================================
// 1. SEARCHING ALGORITHMS
// ==========================================
class SearchingAlgorithms {
  // Helper to check if array is sorted by keyProp
  static isSorted(arr, keyProp = 'id') {
    for (let i = 0; i < arr.length - 1; i++) {
      const v1 = keyProp ? arr[i][keyProp] : arr[i];
      const v2 = keyProp ? arr[i + 1][keyProp] : arr[i + 1];
      if (v1 > v2) return false;
    }
    return true;
  }

  // Linear / Sequential Search - O(n)
  static linearSearch(arr, key, keyProp = 'id') {
    const steps = [];
    let comparisons = 0;
    const startTime = performance.now();

    steps.push(`Starting Linear Search for Target Key: ${key}`);
    for (let i = 0; i < arr.length; i++) {
      comparisons++;
      const val = keyProp ? arr[i][keyProp] : arr[i];
      steps.push(`Step ${i + 1}: Checking index ${i} (Value: ${val})`);
      if (val == key) {
        const timeTaken = (performance.now() - startTime).toFixed(4);
        steps.push(`Target found at index ${i}! Total comparisons: ${comparisons}`);
        return {
          found: true,
          index: i,
          item: arr[i],
          comparisons,
          timeTakenMs: timeTaken,
          complexity: 'O(n)',
          steps
        };
      }
    }

    const timeTaken = (performance.now() - startTime).toFixed(4);
    steps.push(`Target key not found after ${comparisons} comparisons.`);
    return {
      found: false,
      index: -1,
      item: null,
      comparisons,
      timeTakenMs: timeTaken,
      complexity: 'O(n)',
      steps
    };
  }

  // Sentinel Search - O(n)
  static sentinelSearch(arr, key, keyProp = 'id') {
    const steps = [];
    let comparisons = 0;
    const startTime = performance.now();
    const n = arr.length;

    if (n === 0) {
      return { found: false, index: -1, comparisons: 0, timeTakenMs: 0, complexity: 'O(n)', steps: ['Array is empty'] };
    }

    const list = [...arr];
    const lastItem = list[n - 1];
    
    // Set sentinel at last element
    const sentinelItem = keyProp ? { ...lastItem, [keyProp]: key } : key;
    list[n - 1] = sentinelItem;

    steps.push(`Sentinel Search: Set target sentinel "${key}" at last index ${n - 1}`);
    let i = 0;
    while (true) {
      comparisons++;
      const val = keyProp ? list[i][keyProp] : list[i];
      steps.push(`Checking index ${i} (Value: ${val})`);
      if (val == key) break;
      i++;
    }

    // Restore original last element
    list[n - 1] = lastItem;
    const timeTaken = (performance.now() - startTime).toFixed(4);

    const isMatch = i < n - 1 || (keyProp ? arr[n - 1][keyProp] == key : arr[n - 1] == key);
    if (isMatch) {
      steps.push(`Target found at index ${i}! Total comparisons: ${comparisons}`);
      return {
        found: true,
        index: i,
        item: arr[i],
        comparisons,
        timeTakenMs: timeTaken,
        complexity: 'O(n)',
        steps
      };
    }

    steps.push(`Target not found (sentinel reached at index ${n - 1}).`);
    return {
      found: false,
      index: -1,
      item: null,
      comparisons,
      timeTakenMs: timeTaken,
      complexity: 'O(n)',
      steps
    };
  }

  // Binary Search - O(log n) [STRICT CHECK FOR SORTED DATA]
  static binarySearch(arr, key, keyProp = 'id') {
    const steps = [];
    let comparisons = 0;
    const startTime = performance.now();

    // Check if data is sorted first!
    if (!this.isSorted(arr, keyProp)) {
      steps.push(`⚠️ WARNING: Binary Search requires sorted data! Array is currently unsorted.`);
      return {
        found: false,
        index: -1,
        item: null,
        comparisons: 0,
        timeTakenMs: 0,
        complexity: 'O(log n)',
        isUnsortedWarning: true,
        steps
      };
    }

    steps.push(`Binary Search: Range [0..${arr.length - 1}]`);
    let low = 0;
    let high = arr.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      comparisons++;
      const midVal = keyProp ? arr[mid][keyProp] : arr[mid];
      steps.push(`Low: ${low}, High: ${high} -> Mid Index: ${mid} (Value: ${midVal})`);

      if (midVal == key) {
        const timeTaken = (performance.now() - startTime).toFixed(4);
        steps.push(`Target found at mid index ${mid}! Comparisons: ${comparisons}`);
        return {
          found: true,
          index: mid,
          item: arr[mid],
          comparisons,
          timeTakenMs: timeTaken,
          complexity: 'O(log n)',
          steps
        };
      } else if (midVal < key) {
        steps.push(`Mid value ${midVal} < Target ${key}. Search right half.`);
        low = mid + 1;
      } else {
        steps.push(`Mid value ${midVal} > Target ${key}. Search left half.`);
        high = mid - 1;
      }
    }

    const timeTaken = (performance.now() - startTime).toFixed(4);
    steps.push(`Target not found in range.`);
    return {
      found: false,
      index: -1,
      item: null,
      comparisons,
      timeTakenMs: timeTaken,
      complexity: 'O(log n)',
      steps
    };
  }

  // Indexed Sequential Search - O(sqrt(n))
  static indexedSequentialSearch(arr, key, keyProp = 'id', blockSize = 3) {
    const steps = [];
    let comparisons = 0;
    const startTime = performance.now();

    const n = arr.length;
    if (n === 0) return { found: false, index: -1, comparisons: 0, timeTakenMs: 0, complexity: 'O(sqrt(n))', steps: ['Empty'] };

    // Build Index Table
    const indexTable = [];
    for (let i = 0; i < n; i += blockSize) {
      const val = keyProp ? arr[i][keyProp] : arr[i];
      indexTable.push({ index: i, key: val });
    }
    steps.push(`Created Index Table (Block Size = ${blockSize}): ${JSON.stringify(indexTable.map(x => `[Idx:${x.index}, Key:${x.key}]`))}`);

    // Search Index Table
    let targetBlock = -1;
    for (let i = 0; i < indexTable.length; i++) {
      comparisons++;
      steps.push(`Checking Index Table entry ${i}: key ${indexTable[i].key}`);
      if (indexTable[i].key == key) {
        const timeTaken = (performance.now() - startTime).toFixed(4);
        steps.push(`Target directly found in Index Table at index ${indexTable[i].index}!`);
        return {
          found: true,
          index: indexTable[i].index,
          item: arr[indexTable[i].index],
          comparisons,
          timeTakenMs: timeTaken,
          complexity: 'O(sqrt(n))',
          steps
        };
      }
      if (indexTable[i].key > key) {
        targetBlock = i - 1;
        break;
      }
    }

    if (targetBlock === -1) targetBlock = indexTable.length - 1;

    steps.push(`Searching inside Block ${targetBlock}`);
    const startIdx = indexTable[targetBlock].index;
    const endIdx = Math.min(startIdx + blockSize, n);

    for (let i = startIdx; i < endIdx; i++) {
      comparisons++;
      const val = keyProp ? arr[i][keyProp] : arr[i];
      steps.push(`Sequential scan in Block: Index ${i} (Value: ${val})`);
      if (val == key) {
        const timeTaken = (performance.now() - startTime).toFixed(4);
        steps.push(`Target found at index ${i}!`);
        return {
          found: true,
          index: i,
          item: arr[i],
          comparisons,
          timeTakenMs: timeTaken,
          complexity: 'O(sqrt(n))',
          steps
        };
      }
    }

    const timeTaken = (performance.now() - startTime).toFixed(4);
    steps.push(`Target not found.`);
    return {
      found: false,
      index: -1,
      item: null,
      comparisons,
      timeTakenMs: timeTaken,
      complexity: 'O(sqrt(n))',
      steps
    };
  }

  // Fibonacci Search - O(log n)
  static fibonacciSearch(arr, key, keyProp = 'id') {
    const steps = [];
    let comparisons = 0;
    const startTime = performance.now();
    const n = arr.length;

    let fibM2 = 0;
    let fibM1 = 1;
    let fibM = fibM2 + fibM1;

    while (fibM < n) {
      fibM2 = fibM1;
      fibM1 = fibM;
      fibM = fibM2 + fibM1;
    }

    steps.push(`Fibonacci Search: Initialized Fib numbers (FibM: ${fibM}, FibM1: ${fibM1}, FibM2: ${fibM2})`);

    let offset = -1;
    while (fibM > 1) {
      const i = Math.min(offset + fibM2, n - 1);
      comparisons++;
      const val = keyProp ? arr[i][keyProp] : arr[i];
      steps.push(`Checking index i = min(offset + FibM2, n-1) = ${i} (Value: ${val})`);

      if (val == key) {
        const timeTaken = (performance.now() - startTime).toFixed(4);
        steps.push(`Target found at index ${i}!`);
        return {
          found: true,
          index: i,
          item: arr[i],
          comparisons,
          timeTakenMs: timeTaken,
          complexity: 'O(log n)',
          steps
        };
      } else if (val < key) {
        steps.push(`Value ${val} < Target ${key}. Cut sub-array from offset to i.`);
        fibM = fibM1;
        fibM1 = fibM2;
        fibM2 = fibM - fibM1;
        offset = i;
      } else {
        steps.push(`Value ${val} > Target ${key}. Cut sub-array after i.`);
        fibM = fibM2;
        fibM1 = fibM1 - fibM2;
        fibM2 = fibM - fibM1;
      }
    }

    if (fibM1 && offset + 1 < n) {
      comparisons++;
      const lastVal = keyProp ? arr[offset + 1][keyProp] : arr[offset + 1];
      if (lastVal == key) {
        const timeTaken = (performance.now() - startTime).toFixed(4);
        steps.push(`Target found at index ${offset + 1}!`);
        return {
          found: true,
          index: offset + 1,
          item: arr[offset + 1],
          comparisons,
          timeTakenMs: timeTaken,
          complexity: 'O(log n)',
          steps
        };
      }
    }

    const timeTaken = (performance.now() - startTime).toFixed(4);
    steps.push(`Target not found.`);
    return {
      found: false,
      index: -1,
      item: null,
      comparisons,
      timeTakenMs: timeTaken,
      complexity: 'O(log n)',
      steps
    };
  }
}

// ==========================================
// 2. SORTING ALGORITHMS
// ==========================================
class SortingAlgorithms {
  static getVal(item, keyProp) {
    if (!keyProp) return item;
    return item[keyProp];
  }

  // Bubble Sort - O(n^2)
  static bubbleSort(inputArray, keyProp = 'id', asc = true) {
    const arr = inputArray.map(x => ({ ...x }));
    let comparisons = 0;
    let swaps = 0;
    const steps = [];
    const startTime = performance.now();
    const n = arr.length;

    steps.push(`Starting Bubble Sort on ${n} items by '${keyProp}'`);

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        comparisons++;
        const v1 = this.getVal(arr[j], keyProp);
        const v2 = this.getVal(arr[j + 1], keyProp);

        const shouldSwap = asc ? v1 > v2 : v1 < v2;
        if (shouldSwap) {
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          swaps++;
          swapped = true;
          steps.push(`Swap index ${j} (${v1}) with index ${j + 1} (${v2})`);
        }
      }
      if (!swapped) {
        steps.push(`Pass ${i + 1}: Early break - Array is already sorted!`);
        break;
      }
    }

    const timeTakenMs = (performance.now() - startTime).toFixed(4);
    return { sortedArray: arr, comparisons, swaps, timeTakenMs, complexity: 'O(n^2)', steps };
  }

  // Selection Sort - O(n^2)
  static selectionSort(inputArray, keyProp = 'id', asc = true) {
    const arr = inputArray.map(x => ({ ...x }));
    let comparisons = 0;
    let swaps = 0;
    const steps = [];
    const startTime = performance.now();
    const n = arr.length;

    steps.push(`Starting Selection Sort on ${n} items`);

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        comparisons++;
        const vCurr = this.getVal(arr[j], keyProp);
        const vMin = this.getVal(arr[minIdx], keyProp);

        const isBetter = asc ? vCurr < vMin : vCurr > vMin;
        if (isBetter) minIdx = j;
      }
      if (minIdx !== i) {
        const temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
        swaps++;
        steps.push(`Found minimum ${this.getVal(arr[i], keyProp)} at index ${minIdx} -> swapped to index ${i}`);
      }
    }

    const timeTakenMs = (performance.now() - startTime).toFixed(4);
    return { sortedArray: arr, comparisons, swaps, timeTakenMs, complexity: 'O(n^2)', steps };
  }

  // Insertion Sort - O(n^2)
  static insertionSort(inputArray, keyProp = 'id', asc = true) {
    const arr = inputArray.map(x => ({ ...x }));
    let comparisons = 0;
    let swaps = 0; // shifts
    const steps = [];
    const startTime = performance.now();
    const n = arr.length;

    steps.push(`Starting Insertion Sort on ${n} items`);

    for (let i = 1; i < n; i++) {
      const keyItem = arr[i];
      const keyVal = this.getVal(keyItem, keyProp);
      let j = i - 1;

      while (j >= 0) {
        comparisons++;
        const currVal = this.getVal(arr[j], keyProp);
        const shouldShift = asc ? currVal > keyVal : currVal < keyVal;

        if (shouldShift) {
          arr[j + 1] = arr[j];
          swaps++;
          j--;
        } else {
          break;
        }
      }
      arr[j + 1] = keyItem;
      steps.push(`Inserted value ${keyVal} at position ${j + 1}`);
    }

    const timeTakenMs = (performance.now() - startTime).toFixed(4);
    return { sortedArray: arr, comparisons, swaps, timeTakenMs, complexity: 'O(n^2)', steps };
  }

  // Quick Sort - O(n log n) [Divide & Conquer]
  static quickSort(inputArray, keyProp = 'id', asc = true) {
    const arr = inputArray.map(x => ({ ...x }));
    let comparisons = 0;
    let swaps = 0;
    const steps = [];
    const startTime = performance.now();

    const partition = (low, high) => {
      const pivotVal = this.getVal(arr[high], keyProp);
      steps.push(`Partition range [${low}..${high}] with Pivot: ${pivotVal}`);
      let i = low - 1;

      for (let j = low; j < high; j++) {
        comparisons++;
        const currVal = this.getVal(arr[j], keyProp);
        const condition = asc ? currVal < pivotVal : currVal > pivotVal;
        if (condition) {
          i++;
          const temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;
          swaps++;
        }
      }
      const temp = arr[i + 1];
      arr[i + 1] = arr[high];
      arr[high] = temp;
      swaps++;
      steps.push(`Pivot placed at index ${i + 1}`);
      return i + 1;
    };

    const qSort = (low, high) => {
      if (low < high) {
        const pi = partition(low, high);
        qSort(low, pi - 1);
        qSort(pi + 1, high);
      }
    };

    qSort(0, arr.length - 1);

    const timeTakenMs = (performance.now() - startTime).toFixed(4);
    return { sortedArray: arr, comparisons, swaps, timeTakenMs, complexity: 'O(n log n)', steps };
  }

  // Shell Sort - O(n^1.5)
  static shellSort(inputArray, keyProp = 'id', asc = true) {
    const arr = inputArray.map(x => ({ ...x }));
    let comparisons = 0;
    let swaps = 0;
    const steps = [];
    const startTime = performance.now();
    const n = arr.length;

    steps.push(`Starting Shell Sort on ${n} items with gap sequence`);

    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      steps.push(`Current Gap size: ${gap}`);
      for (let i = gap; i < n; i++) {
        const tempItem = arr[i];
        const tempVal = this.getVal(tempItem, keyProp);
        let j = i;

        while (j >= gap) {
          comparisons++;
          const prevVal = this.getVal(arr[j - gap], keyProp);
          const shouldShift = asc ? prevVal > tempVal : prevVal < tempVal;

          if (shouldShift) {
            arr[j] = arr[j - gap];
            swaps++;
            j -= gap;
          } else {
            break;
          }
        }
        arr[j] = tempItem;
      }
    }

    const timeTakenMs = (performance.now() - startTime).toFixed(4);
    return { sortedArray: arr, comparisons, swaps, timeTakenMs, complexity: 'O(n^1.5)', steps };
  }
}

// ==========================================
// 3. ALGORITHMIC PARADIGMS DEMO
// ==========================================
class AlgorithmicParadigms {
  // Divide and Conquer Demonstration (Quick Sort Partitioning)
  static divideAndConquerDemo(items) {
    return SortingAlgorithms.quickSort(items, 'id', true);
  }

  // Greedy Strategy Demonstration (Resource Allocation)
  static greedyResourceAllocation(requests, availableQuantity) {
    const logs = [];
    logs.push(`Greedy Strategy: Allocating ${availableQuantity} unit(s) among ${requests.length} pending requests.`);

    // Sort requests greedily by highest priority score first
    const sorted = [...requests].sort((a, b) => b.priority - a.priority);

    const allocated = [];
    let count = availableQuantity;

    for (const req of sorted) {
      if (count > 0) {
        allocated.push(req);
        count--;
        logs.push(`Greedy Selection: Allocated to ${req.name} (Priority ${req.priority})`);
      } else {
        logs.push(`Resource Exhausted: ${req.name} (Priority ${req.priority}) remains in queue.`);
      }
    }

    return { allocated, logs };
  }

  // Dynamic Programming Demonstration (Late Fee Calculation Table)
  static dynamicProgrammingLateFine(daysOverdue, ratePerDay = 5) {
    const dp = new Array(daysOverdue + 1).fill(0);
    const trace = [];

    trace.push(`DP Table Calculation for ${daysOverdue} Overdue Days:`);
    trace.push(`Rules: Days 1-2 = Free (Grace period). Days 3-7 = $${ratePerDay}/day. Day 8+ = $${ratePerDay * 2}/day.`);

    for (let d = 1; d <= daysOverdue; d++) {
      if (d <= 2) {
        dp[d] = dp[d - 1] + 0;
      } else if (d <= 7) {
        dp[d] = dp[d - 1] + ratePerDay;
      } else {
        dp[d] = dp[d - 1] + (ratePerDay * 2);
      }
      trace.push(`Day ${d}: Fine = $${dp[d]}`);
    }

    return { totalFine: dp[daysOverdue], dpTable: dp, trace };
  }
}

// Export for global scope
window.SearchingAlgorithms = SearchingAlgorithms;
window.SortingAlgorithms = SortingAlgorithms;
window.AlgorithmicParadigms = AlgorithmicParadigms;
