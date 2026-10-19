/**
 * Hostel Washing Machine Booking Portal - QR Code Service
 * 
 * Generates 4 unique QR codes, one for each 9.0 Kg machine.
 * Formatted for physical stickers to paste directly on each washing machine.
 * When scanned from any smartphone camera, opens the booking app directly
 * with that specific machine pre-selected.
 */

const QRService = (function () {
    /**
     * Get target booking URL for a specific machine
     */
    function getMachineBookingUrl(machineId) {
        const url = new URL(window.location.href);
        url.search = `?machine=${machineId}`;
        url.hash = '';
        return url.toString();
    }

    /**
     * Render a QR code into a target DOM container
     */
    function renderQRCode(containerElement, text, size = 180) {
        if (!containerElement) return;
        containerElement.innerHTML = '';

        if (window.QRCode) {
            new window.QRCode(containerElement, {
                text: text,
                width: size,
                height: size,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel.H
            });
        } else {
            containerElement.innerHTML = `
                <div style="padding: 12px; border: 1px dashed var(--border-color); border-radius: 8px; text-align: center;">
                    <p style="font-size: 11px; word-break: break-all; color: var(--text-muted);">${text}</p>
                </div>
            `;
        }
    }

    /**
     * Render all 4 machine QR code cards for viewing / printing stickers
     */
    function renderAllMachineQRCards(containerElement, machines) {
        if (!containerElement) return;
        containerElement.innerHTML = '';

        machines.forEach(machine => {
            const card = document.createElement('div');
            card.className = 'qr-print-card';
            card.id = `qr-print-card-${machine.id}`;
            const bookingUrl = getMachineBookingUrl(machine.id);

            card.innerHTML = `
                <div class="qr-print-header">
                    <span class="qr-print-badge">WASHING MACHINE ${machine.id}</span>
                    <h3 class="qr-print-title">${machine.name}</h3>
                    <p class="qr-print-subtitle" style="font-weight: 700; color: #4f46e5;">9.0 KG CAPACITY • 75 MIN SLOT</p>
                </div>
                <div class="qr-code-box" id="qr-box-machine-${machine.id}"></div>
                <div class="qr-print-footer">
                    <p class="qr-instructions" style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">
                        📱 मोबाईलने स्कॅन करा आणि स्लॉट बुक करा
                    </p>
                    <p style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                        Point camera to book Machine ${machine.id}
                    </p>
                    <code class="qr-url-text" style="font-size: 0.7rem; color: #94a3b8; margin-top: 6px; word-break: break-all;">${bookingUrl}</code>
                    
                    <button type="button" class="btn btn-secondary btn-print-sticker" data-machine-id="${machine.id}" style="margin-top: 10px; width: 100%; font-size: 0.8rem; padding: 6px 12px;">
                        🖨️ Print Machine ${machine.id} Sticker
                    </button>
                </div>
            `;

            containerElement.appendChild(card);

            // Render QR Code
            const box = card.querySelector(`#qr-box-machine-${machine.id}`);
            renderQRCode(box, bookingUrl, 160);
        });

        // Attach single sticker print handlers
        containerElement.querySelectorAll('.btn-print-sticker').forEach(btn => {
            btn.addEventListener('click', () => {
                const machineId = btn.dataset.machineId;
                printSingleSticker(machineId);
            });
        });
    }

    /**
     * Print a single sticker designed to be pasted on 1 machine
     */
    function printSingleSticker(machineId) {
        const bookingUrl = getMachineBookingUrl(machineId);
        const printWindow = window.open('', '_blank', 'width=600,height=700');
        if (!printWindow) {
            alert('Please allow popups to print the machine sticker.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Machine ${machineId} (9.0 Kg) - QR Sticker</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Plus Jakarta Sans', Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f8fafc;
                    }
                    .sticker {
                        width: 320px;
                        border: 3px solid #0f172a;
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        background: #ffffff;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .badge {
                        background: #4f46e5;
                        color: #ffffff;
                        font-size: 14px;
                        font-weight: 800;
                        padding: 6px 16px;
                        border-radius: 999px;
                        letter-spacing: 0.05em;
                        display: inline-block;
                    }
                    h1 {
                        font-size: 24px;
                        font-weight: 800;
                        margin: 12px 0 4px 0;
                        color: #0f172a;
                    }
                    .sub {
                        font-size: 14px;
                        font-weight: 700;
                        color: #4f46e5;
                        margin-bottom: 16px;
                    }
                    .qr-holder {
                        display: flex;
                        justify-content: center;
                        margin: 16px 0;
                    }
                    .marathi {
                        font-size: 14px;
                        font-weight: 700;
                        color: #0f172a;
                        margin: 8px 0 2px 0;
                    }
                    .eng {
                        font-size: 12px;
                        color: #64748b;
                        margin: 0 0 12px 0;
                    }
                    .url {
                        font-size: 10px;
                        color: #94a3b8;
                        word-break: break-all;
                    }
                    @media print {
                        body { background: transparent; }
                        .sticker { box-shadow: none; }
                    }
                </style>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            </head>
            <body>
                <div class="sticker">
                    <span class="badge">HOSTEL LAUNDRY</span>
                    <h1>WASHING MACHINE ${machineId}</h1>
                    <div class="sub">9.0 KG CAPACITY • 75 MIN SLOT</div>
                    <div id="print-qr" class="qr-holder"></div>
                    <div class="marathi">📱 मोबाईलने स्कॅन करा आणि स्लॉट बुक करा</div>
                    <div class="eng">Scan with phone camera to book this machine</div>
                    <div class="url">${bookingUrl}</div>
                </div>
                <script>
                    new QRCode(document.getElementById('print-qr'), {
                        text: "${bookingUrl}",
                        width: 180,
                        height: 180,
                        colorDark: "#0f172a",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    setTimeout(function() {
                        window.print();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Read URL parameter to detect if user arrived via QR Code scan
     */
    function getPreselectedMachineFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const machineId = params.get('machine');
        if (machineId && ['1', '2', '3', '4'].includes(machineId)) {
            return Number(machineId);
        }
        return null;
    }

    return {
        getMachineBookingUrl,
        renderQRCode,
        renderAllMachineQRCards,
        printSingleSticker,
        getPreselectedMachineFromUrl
    };
})();

// Export globally
window.QRService = QRService;
