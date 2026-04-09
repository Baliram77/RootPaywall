"use strict";
/**
 * @x402/unlocker - Revocation storage (memory or file-backed)
 *
 * Note: This is a best-effort revocation layer. Tokens are still time-bounded via JWT expiry.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileRevocationStore = exports.MemoryRevocationStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MemoryRevocationStore {
    constructor() {
        this.revoked = new Map(); // key -> until (unix seconds) or null
    }
    revoke(key, until) {
        this.revoked.set(key, typeof until === 'number' ? until : null);
    }
    isRevoked(key, nowSeconds = Math.floor(Date.now() / 1000)) {
        const until = this.revoked.get(key);
        if (until == null)
            return this.revoked.has(key);
        if (until <= nowSeconds) {
            this.revoked.delete(key);
            return false;
        }
        return true;
    }
    cleanup(nowSeconds = Math.floor(Date.now() / 1000)) {
        for (const [k, until] of this.revoked.entries()) {
            if (until != null && until <= nowSeconds)
                this.revoked.delete(k);
        }
    }
}
exports.MemoryRevocationStore = MemoryRevocationStore;
function ensureDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
function readJson(filePath, defaultValue) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return defaultValue;
    }
}
function writeJson(filePath, data) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
class FileRevocationStore {
    constructor(filePath) {
        this.filePath = filePath;
    }
    revoke(key, until) {
        const state = readJson(this.filePath, {});
        state[key] = typeof until === 'number' ? until : null;
        writeJson(this.filePath, state);
    }
    isRevoked(key, nowSeconds = Math.floor(Date.now() / 1000)) {
        const state = readJson(this.filePath, {});
        if (!(key in state))
            return false;
        const until = state[key];
        if (until == null)
            return true;
        if (until <= nowSeconds) {
            delete state[key];
            writeJson(this.filePath, state);
            return false;
        }
        return true;
    }
    cleanup(nowSeconds = Math.floor(Date.now() / 1000)) {
        const state = readJson(this.filePath, {});
        let changed = false;
        for (const [k, until] of Object.entries(state)) {
            if (until != null && until <= nowSeconds) {
                delete state[k];
                changed = true;
            }
        }
        if (changed)
            writeJson(this.filePath, state);
    }
}
exports.FileRevocationStore = FileRevocationStore;
//# sourceMappingURL=RevocationStore.js.map