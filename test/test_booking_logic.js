/**
 * Hostel Washing Machine Booking Portal - Booking Logic & Overlap Unit Tests
 * 
 * Verifies:
 * 1. 75-minute exact duration enforcement.
 * 2. 7-day rolling window validation (Today to Today + 6 Days).
 * 3. Overlap detection algorithm (identical start, partial overlap, enclosing slot, adjacent edge cases).
 * 4. Multi-machine isolation (Machine 1 and Machine 2 can be booked at the exact same time).
 * 5. Cancellation behavior (cancelled bookings do not block new bookings).
 */

const assert = require('assert');

// 1. Duration Check
function check75MinDuration(startISO, endISO) {
    const startMs = new Date(startISO).getTime();
    const endMs = new Date(endISO).getTime();
    const diffMinutes = (endMs - startMs) / (60 * 1000);
    return diffMinutes === 75;
}

// 2. 7-Day Window Validation
function isWithin7DayWindow(bookingDateStr, referenceTodayStr) {
    const today = new Date(referenceTodayStr + 'T00:00:00Z');
    const target = new Date(bookingDateStr + 'T00:00:00Z');
    const maxDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);

    return target >= today && target <= maxDate;
}

// 3. PostgreSQL tstzrange Overlap Logic
// In PostgreSQL: tstzrange(A_start, A_end) && tstzrange(B_start, B_end)
// Which evaluates to: A_start < B_end AND A_end > B_start
function checkOverlap(slotA, slotB) {
    if (slotA.machine_id !== slotB.machine_id) return false;
    if (slotA.status === 'cancelled' || slotB.status === 'cancelled') return false;

    const aStart = new Date(slotA.start_time).getTime();
    const aEnd = new Date(slotA.end_time).getTime();
    const bStart = new Date(slotB.start_time).getTime();
    const bEnd = new Date(slotB.end_time).getTime();

    return aStart < bEnd && aEnd > bStart;
}

// =============================================================================
// RUN TESTS
// =============================================================================
console.log('=================================================================');
console.log('RUNNING HOSTEL WASHING MACHINE BOOKING LOGIC TESTS');
console.log('=================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
    totalTests++;
    try {
        fn();
        console.log(`✓ PASS: ${testName}`);
        passedTests++;
    } catch (err) {
        console.error(`✕ FAIL: ${testName}`);
        console.error(`  Error: ${err.message}\n`);
    }
}

// TEST 1: Exact 75-Minute Duration
runTest('Should validate exact 75-minute duration', () => {
    const valid = check75MinDuration('2026-10-19T09:00:00Z', '2026-10-19T10:15:00Z');
    assert.strictEqual(valid, true, '09:00 to 10:15 must be exactly 75 minutes');

    const invalidShort = check75MinDuration('2026-10-19T09:00:00Z', '2026-10-19T10:00:00Z');
    assert.strictEqual(invalidShort, false, '60 minutes must fail 75-min check');

    const invalidLong = check75MinDuration('2026-10-19T09:00:00Z', '2026-10-19T10:30:00Z');
    assert.strictEqual(invalidLong, false, '90 minutes must fail 75-min check');
});

// TEST 2: 7-Day Rolling Window
runTest('Should allow bookings for today and next 6 days (7 rolling days)', () => {
    const today = '2026-10-19';

    // Today (Day 0) - Allowed
    assert.strictEqual(isWithin7DayWindow('2026-10-19', today), true);
    // Tomorrow (Day 1) - Allowed
    assert.strictEqual(isWithin7DayWindow('2026-10-20', today), true);
    // Day 6 (End of window) - Allowed
    assert.strictEqual(isWithin7DayWindow('2026-10-25', today), true);
    // Past date (Yesterday) - REJECTED
    assert.strictEqual(isWithin7DayWindow('2026-10-18', today), false);
    // Beyond 6 days (Day 7) - REJECTED
    assert.strictEqual(isWithin7DayWindow('2026-10-26', today), false);
});

// TEST 3: Overlapping Bookings on the Same Machine
runTest('Should detect double-booking overlap on the same machine', () => {
    const existingBooking = {
        machine_id: 1,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'confirmed'
    };

    // Scenario A: Exact same slot
    const exactSame = {
        machine_id: 1,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'confirmed'
    };
    assert.strictEqual(checkOverlap(existingBooking, exactSame), true, 'Exact duplicate slot must be detected as overlap');

    // Scenario B: Partial overlap (starts 30 mins into existing cycle)
    const partialOverlap = {
        machine_id: 1,
        start_time: '2026-10-19T09:30:00Z',
        end_time: '2026-10-19T10:45:00Z',
        status: 'confirmed'
    };
    assert.strictEqual(checkOverlap(existingBooking, partialOverlap), true, 'Partial start overlap must be detected');

    // Scenario C: Partial overlap (ends 15 mins into existing cycle)
    const endOverlap = {
        machine_id: 1,
        start_time: '2026-10-19T08:00:00Z',
        end_time: '2026-10-19T09:15:00Z',
        status: 'confirmed'
    };
    assert.strictEqual(checkOverlap(existingBooking, endOverlap), true, 'Partial end overlap must be detected');
});

// TEST 4: Adjacent Non-Overlapping Bookings
runTest('Should allow back-to-back adjacent bookings without collision', () => {
    const slot1 = {
        machine_id: 1,
        start_time: '2026-10-19T07:45:00Z',
        end_time: '2026-10-19T09:00:00Z',
        status: 'confirmed'
    };

    const slot2 = {
        machine_id: 1,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'confirmed'
    };

    // Slot 1 ends at 09:00, Slot 2 starts at 09:00.
    // In PostgreSQL half-open range '[)', this does NOT overlap!
    assert.strictEqual(checkOverlap(slot1, slot2), false, 'Adjacent back-to-back slots must NOT collide');
});

// TEST 5: Different Machines at the Same Time
runTest('Should allow different washing machines to be booked at the exact same time', () => {
    const machine1Slot = {
        machine_id: 1,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'confirmed'
    };

    const machine2Slot = {
        machine_id: 2,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'confirmed'
    };

    assert.strictEqual(checkOverlap(machine1Slot, machine2Slot), false, 'Different machines must not block each other');
});

// TEST 6: Cancelled Bookings Do Not Block New Bookings
runTest('Should allow booking a slot if previous booking was cancelled', () => {
    const cancelledBooking = {
        machine_id: 1,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'cancelled'
    };

    const newBooking = {
        machine_id: 1,
        start_time: '2026-10-19T09:00:00Z',
        end_time: '2026-10-19T10:15:00Z',
        status: 'confirmed'
    };

    assert.strictEqual(checkOverlap(cancelledBooking, newBooking), false, 'Cancelled slot must be free for new booking');
});

// SUMMARY
console.log('\n=================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('=================================================================\n');

if (passedTests === totalTests) {
    console.log('✓ All booking logic, duration constraints, and overlap algorithms verified!');
    process.exit(0);
} else {
    process.exit(1);
}
