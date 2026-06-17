import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { RoomManager } from './roomManager';
import { WebSocketMessage, ServerMessage } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clientMap = new Map<string, Set<WebSocket>>();

function broadcast(roomId: string, msg: ServerMessage) {
  const clients = clientMap.get(roomId);
  if (!clients) return;
  const data = JSON.stringify(msg);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendToClient(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

const roomManager = new RoomManager(broadcast);

app.get('/api/rooms', (_req, res) => {
  const rooms: Array<{
    id: string; name: string; playerCount: number; maxPlayers: number;
    gameStarted: boolean; hostName: string;
  }> = [];
  const anyFunc = roomManager as any;
  if (anyFunc.rooms) {
    anyFunc.rooms.forEach((room: any) => {
      const host = room.players.find((p: any) => p.id === room.hostId);
      rooms.push({
        id: room.id,
        name: room.name,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        gameStarted: room.gameStarted,
        hostName: host?.name || '未知'
      });
    });
  }
  res.json(rooms);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

wss.on('connection', (ws) => {
  let clientRoomId: string | null = null;
  let clientPlayerId: string | null = null;

  ws.on('message', (data) => {
    let msg: WebSocketMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      sendToClient(ws, { type: 'ERROR', message: '无效消息格式' });
      return;
    }

    switch (msg.type) {
      case 'CREATE_ROOM': {
        const result = roomManager.createRoom(msg.playerName, msg.roomName, msg.maxPlayers);
        clientRoomId = result.room.id;
        clientPlayerId = result.playerId;
        if (!clientMap.has(clientRoomId)) clientMap.set(clientRoomId, new Set());
        clientMap.get(clientRoomId)!.add(ws);
        sendToClient(ws, { type: 'ROOM_CREATED', room: result.room, playerId: result.playerId });
        break;
      }

      case 'JOIN_ROOM': {
        const result = roomManager.joinRoom(msg.playerName, msg.roomId);
        if ('error' in result) {
          sendToClient(ws, { type: 'ERROR', message: result.error });
          return;
        }
        clientRoomId = result.room.id;
        clientPlayerId = result.playerId;
        if (!clientMap.has(clientRoomId)) clientMap.set(clientRoomId, new Set());
        clientMap.get(clientRoomId)!.add(ws);
        sendToClient(ws, { type: 'ROOM_JOINED', room: result.room, playerId: result.playerId });
        broadcast(clientRoomId, { type: 'PLAYER_JOINED', room: result.room });
        break;
      }

      case 'LEAVE_ROOM': {
        if (clientRoomId && clientPlayerId) {
          roomManager.leaveRoom(msg.roomId, msg.playerId);
          const clients = clientMap.get(msg.roomId);
          clients?.delete(ws);
          const room = roomManager.getRoom(msg.roomId);
          if (room) {
            broadcast(msg.roomId, { type: 'PLAYER_LEFT', room });
          }
          clientRoomId = null;
          clientPlayerId = null;
        }
        break;
      }

      case 'START_GAME': {
        if (msg.playerId !== clientPlayerId) return;
        const room = roomManager.startGame(msg.roomId, msg.playerId);
        if (room) {
          broadcast(msg.roomId, { type: 'GAME_STARTED', room });
        }
        break;
      }

      case 'CHAT': {
        if (msg.playerId !== clientPlayerId) return;
        roomManager.addChatMessage(msg.roomId, msg.playerId, msg.content);
        break;
      }

      case 'SUBMIT_BID': {
        if (msg.playerId !== clientPlayerId) return;
        roomManager.submitBids(msg.roomId, msg.playerId, msg.bids);
        const room = roomManager.getRoom(msg.roomId);
        if (room) broadcast(msg.roomId, { type: 'STATE_UPDATED', room });
        break;
      }

      case 'BREWING_ACTION': {
        if (msg.playerId !== clientPlayerId) return;
        roomManager.performBrewingAction(msg.roomId, msg.playerId, msg.action, msg.data);
        break;
      }

      case 'LIST_FOR_SALE': {
        if (msg.playerId !== clientPlayerId) return;
        const sales = roomManager.processSales(msg.roomId, msg.playerId, msg.listings);
        const room = roomManager.getRoom(msg.roomId);
        if (room && sales) {
          broadcast(msg.roomId, { type: 'SALES_RESULT', room, sales });
        }
        break;
      }

      case 'ENTER_COMPETITION': {
        if (msg.playerId !== clientPlayerId) return;
        roomManager.enterCompetition(msg.roomId, msg.playerId, msg.wineId);
        const room = roomManager.getRoom(msg.roomId);
        if (room) broadcast(msg.roomId, { type: 'STATE_UPDATED', room });
        break;
      }

      case 'PHASE_TIMEOUT': {
        if (msg.playerId !== clientPlayerId) return;
        roomManager.phaseTimeout(msg.roomId);
        break;
      }

      case 'REQUEST_STATE': {
        const room = roomManager.getRoom(msg.roomId);
        if (room) {
          sendToClient(ws, { type: 'STATE_UPDATED', room });
        }
        break;
      }

      default:
        sendToClient(ws, { type: 'ERROR', message: '未知消息类型' });
    }
  });

  ws.on('close', () => {
    if (clientRoomId) {
      const clients = clientMap.get(clientRoomId);
      clients?.delete(ws);
      if (clientPlayerId) {
        roomManager.leaveRoom(clientRoomId, clientPlayerId);
        const room = roomManager.getRoom(clientRoomId);
        if (room) {
          broadcast(clientRoomId, { type: 'PLAYER_LEFT', room });
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

process.on('SIGINT', () => {
  console.log('服务器关闭中...');
  roomManager.cleanup();
  wss.close();
  server.close(() => process.exit(0));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 酿酒厂游戏服务器启动成功`);
  console.log(`📡 HTTP 端口: ${PORT}`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws`);
  console.log(`🏥 健康检查: http://0.0.0.0:${PORT}/api/health`);
});
