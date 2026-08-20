/**
 * Multi-Laptop Offline Peer-to-Peer Real-Time Sync Engine
 * Rano Air CPCP Progress Tracker
 *
 * Keeps up to 3 laptops connected & updated live over local hangar Wi-Fi,
 * offline router, or local hotspot without requiring an internet connection.
 */

class PeerSyncEngine {
  constructor() {
    this.channelName = 'rano-air-cpcp-sync-v1';
    this.broadcastChannel = null;
    this.peerId = this.getOrCreatePeerId();
    this.connectedPeers = new Set([this.peerId]);
    this.listeners = [];
    this.heartbeatTimer = null;
    this.ws = null;
    this.isOnline = true;
  }

  getOrCreatePeerId() {
    let id = localStorage.getItem('rano-air-cpcp-peer-id');
    if (!id) {
      id = 'laptop-' + Math.random().toString(36).substring(2, 7);
      localStorage.setItem('rano-air-cpcp-peer-id', id);
    }
    return id;
  }

  init() {
    // 1. Initialize BroadcastChannel for local browser tabs / desktop windows
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(this.channelName);
      this.broadcastChannel.onmessage = (event) => this.handleSyncMessage(event.data);
    }

    // 2. Storage event fallback for older engines
    window.addEventListener('storage', (event) => {
      if (event.key === 'rano-air-cpcp-peer-event' && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue);
          if (payload.sender !== this.peerId) {
            this.handleSyncMessage(payload);
          }
        } catch (e) {}
      }
    });

    // 3. Optional local WebSocket server broadcast (e.g. running on server.js)
    this.connectLocalWebSocket();

    // Start heartbeat
    this.startHeartbeat();

    // Announce presence
    this.broadcast({
      type: 'PEER_JOIN',
      peerId: this.peerId,
      timestamp: Date.now()
    });

    console.log(`[SyncEngine] Initialized peer ${this.peerId}`);
  }

  connectLocalWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8081';
      const wsUrl = `${protocol}//${host}/ws-sync`;
      
      this.ws = new WebSocket(wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.sender !== this.peerId) {
            this.handleSyncMessage(data);
          }
        } catch (e) {}
      };
      this.ws.onerror = () => {
        // Fallback gracefully to BroadcastChannel / Storage sync if WS server unavailable
      };
    } catch (e) {
      // Offline local mode fallback
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast({
        type: 'HEARTBEAT',
        peerId: this.peerId,
        timestamp: Date.now()
      });
      this.updatePeerStatusUI();
    }, 10000);
  }

  broadcast(message) {
    const payload = {
      ...message,
      sender: this.peerId,
      sentAt: new Date().toISOString()
    };

    // BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {}
    }

    // LocalStorage signal for inter-window sync
    try {
      localStorage.setItem('rano-air-cpcp-peer-event', JSON.stringify({
        ...payload,
        _t: Date.now()
      }));
    } catch (e) {}

    // WebSocket signal if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (e) {}
    }
  }

  handleSyncMessage(data) {
    if (!data || data.sender === this.peerId) return;

    if (data.type === 'PEER_JOIN' || data.type === 'HEARTBEAT') {
      this.connectedPeers.add(data.peerId);
      this.updatePeerStatusUI();
      if (data.type === 'PEER_JOIN') {
        // Send ACK back
        this.broadcast({
          type: 'PEER_ACK',
          peerId: this.peerId
        });
      }
      return;
    }

    if (data.type === 'PEER_ACK') {
      this.connectedPeers.add(data.peerId);
      this.updatePeerStatusUI();
      return;
    }

    // Dispatch sync event for state updates
    const event = new CustomEvent('peer-sync-update', { detail: data });
    window.dispatchEvent(event);
  }

  getConnectedPeerCount() {
    return Math.max(1, this.connectedPeers.size);
  }

  updatePeerStatusUI() {
    const count = this.getConnectedPeerCount();
    const badge = document.getElementById('peerSyncBadge');
    if (badge) {
      if (count > 1) {
        badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span> ${count} Laptops Connected`;
        badge.className = "inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-sm";
      } else {
        badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-fuchsia-400 mr-1.5"></span> Live Offline Broadcast`;
        badge.className = "inline-flex items-center rounded-full border border-fuchsia-500/40 bg-fuchsia-950/60 px-2.5 py-1 text-[11px] font-bold text-fuchsia-300 shadow-sm";
      }
    }
  }
}

export const syncEngine = new PeerSyncEngine();
export default syncEngine;
