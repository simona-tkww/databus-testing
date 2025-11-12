// Navigation handling
// ...existing code...
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-menu a');
    const setupSection = document.getElementById('setup-section');
    const messagesSection = document.getElementById('messages-section');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const href = this.getAttribute('href');
            if (href === '#setup') {
                setupSection.style.display = 'block';
                messagesSection.style.display = 'none';
            } else if (href === '#messages') {
                setupSection.style.display = 'none';
                messagesSection.style.display = 'block';
            }
        });
    });
});

// Tunnel Endpoint Generation
// ...existing code...
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateTunnelBtn');
    const tunnelInput = document.getElementById('tunnelUrlInput');
    const copyBtn = document.getElementById('copyTunnelBtn');
    let tunnelUrl = '';
    function updateButtonText() {
        const btnText = document.getElementById('generateTunnelBtnText');
        const btnDots = document.getElementById('generateTunnelBtnDots');
        if (tunnelUrl) {
            btnText.textContent = 'Regenerate Tunnel Endpoint';
        } else {
            btnText.textContent = 'Generate Tunnel Endpoint';
        }
        btnDots.style.display = 'none';
    }
    generateBtn.addEventListener('click', function() {
        generateBtn.disabled = true;
        document.getElementById('generateTunnelBtnText').textContent = 'Generating tunnel endpoint';
        document.getElementById('generateTunnelBtnDots').style.display = 'inline-block';
        tunnelInput.value = 'Generating tunnel endpoint...';
        tunnelInput.style.color = '#3b8fd9';
        function getTextWidth(text, font) {
            const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
            const context = canvas.getContext("2d");
            context.font = font;
            const metrics = context.measureText(text);
            return metrics.width;
        }
        fetch('/api/tunnel/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('generateTunnelBtnDots').style.display = 'none';
            updateButtonText();
            if (data && data.url) {
                tunnelUrl = data.url;
                tunnelInput.value = tunnelUrl;
                tunnelInput.style.color = '#21b2a5';
                copyBtn.style.display = 'inline-block';
                updateButtonText();
            } else {
                if (data && data.error && data.error.toLowerCase().includes('too many requests')) {
                    tunnelInput.value = 'Error: Too many requests. Please try again in 5-10 minutes.';
                } else {
                    tunnelInput.value = 'Error: The server may be offline, unreachable, or returned an unexpected error.';
                }
                tunnelInput.style.color = '#f87271';
                copyBtn.style.display = 'none';
                tunnelUrl = '';
                updateButtonText();
            }
        })
        .catch(err => {
            document.getElementById('generateTunnelBtnDots').style.display = 'none';
            updateButtonText();
            tunnelInput.value = 'Error: The server may be offline, unreachable, or returned an unexpected error.';
            tunnelInput.style.color = '#f87271';
            copyBtn.style.display = 'none';
            tunnelUrl = '';
            updateButtonText();
        })
        .finally(() => {
            generateBtn.disabled = false;
        });
    });
    copyBtn.addEventListener('click', function() {
        if (tunnelUrl) {
            navigator.clipboard.writeText(tunnelUrl);
            copyBtn.style.color = '#21b2a5';
            setTimeout(() => {
                copyBtn.style.color = '#9ca3af';
            }, 1000);
        }
    });
});

// Send Message to DataBus button handler
// ...existing code...
document.addEventListener('DOMContentLoaded', function() {
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const sendMessageOutputContainer = document.getElementById('sendMessageOutputContainer');
    const sendMessageOutput = document.getElementById('sendMessageOutput');
    let originalBtnContent = sendMessageBtn ? sendMessageBtn.innerHTML : '';
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', function() {
            sendMessageBtn.disabled = true;
            sendMessageBtn.innerHTML = '<span style="vertical-align: middle;">Sending</span> <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>';
            const startTime = Date.now();
            Promise.all([
                fetch('/api/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }),
                new Promise(resolve => setTimeout(resolve, 1000))
            ])
            .then(([res]) => res.json())
            .then(data => {
                const elapsed = Date.now() - startTime;
                const remainingDelay = Math.max(0, 1000 - elapsed);
                setTimeout(() => {
                    sendMessageBtn.disabled = false;
                    sendMessageBtn.innerHTML = originalBtnContent;
                    sendMessageOutputContainer.style.display = 'block';
                    if (data.success) {
                        sendMessageOutput.value = data.output;
                        sendMessageOutput.style.color = '#21b2a5';
                        sendMessageBtn.innerHTML = sendMessageBtn.innerHTML.replace('Send Message to DataBus', 'Send New Message');
                    } else {
                        sendMessageOutput.value = data.error || 'Failed to send message.';
                        sendMessageOutput.style.color = '#f87271';
                    }
                }, remainingDelay);
            })
            .catch(err => {
                const elapsed = Date.now() - startTime;
                const remainingDelay = Math.max(0, 1000 - elapsed);
                setTimeout(() => {
                    sendMessageBtn.disabled = false;
                    sendMessageBtn.innerHTML = originalBtnContent;
                    sendMessageOutputContainer.style.display = 'block';
                    sendMessageOutput.value = 'Error: The server may be offline, unreachable, or returned an unexpected error.';
                    sendMessageOutput.style.color = '#f87271';
                }, remainingDelay);
            });
        });
    }
});

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
}

// Escape HTML special characters to prevent XSS
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"`]/g, function (c) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '`': '&#96;'
        }[c];
    });
}

// Create message card
function createMessageCard(msg) {
    const isSuccess = msg.responseCode === 200;
    const iconClass = isSuccess ? 'success' : 'error';
    const statusClass = isSuccess ? 'status-200' : 'status-500';
    const safeId = escapeHtml(String(msg.id));
    const safeEndpoint = escapeHtml(String(msg.endpoint));
    const safeData = escapeHtml(JSON.stringify(msg.data, null, 2));
    return `
        <div class="message-card">
            <div class="message-header">
                <div class="message-info">
                    <div class="message-icon ${iconClass}">
                        ${isSuccess ? 
                            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' :
                            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
                        }
                    </div>
                    <div class="message-details">
                        <h4>Message #${safeId}</h4>
                        <p>${formatTimestamp(msg.timestamp)}</p>
                    </div>
                </div>
                <div class="message-badges">
                    <div class="message-badge ${statusClass}">Status Code: ${escapeHtml(String(msg.responseCode))}</div>
                    <div class="message-badge endpoint">Endpoint: ${safeEndpoint}</div>
                </div>
            </div>
            <div class="message-data">
                <pre>${safeData}</pre>
            </div>
        </div>
    `;
}

// Store last message count to detect changes
let lastMessageCountFetched = 0;
let lastMessagesHash = '';

// Fetch and display messages
function fetchMessages() {
    fetch('/api/messages')
        .then(response => response.json())
        .then(data => {
            const currentHash = data.totalCount + '-' + data.messages.map(m => m.id).join(',');
            if (currentHash !== lastMessagesHash) {
                lastMessagesHash = currentHash;
                lastMessageCountFetched = data.totalCount;
                const messageCountEl2 = document.getElementById('messageCount2');
                const successCountEl = document.getElementById('successCount');
                const errorCountEl = document.getElementById('errorCount');
                const emptyState = document.getElementById('emptyState');
                const messagesList = document.getElementById('messagesList');
                if (messageCountEl2) messageCountEl2.textContent = data.totalCount;
                if (successCountEl) successCountEl.textContent = data.successCount || 0;
                if (errorCountEl) errorCountEl.textContent = data.errorCount || 0;
                if (data.messages.length > 0) {
                    emptyState.style.display = 'none';
                    messagesList.style.display = 'block';
                    messagesList.innerHTML = data.messages
                        .map(msg => createMessageCard(msg))
                        .join('');
                } else {
                    emptyState.style.display = 'block';
                    messagesList.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching messages:', error);
        });
}

// Initialize on page load
fetchMessages();
// Poll for updates every 2 seconds
setInterval(() => {
    fetchMessages();
}, 2000);
