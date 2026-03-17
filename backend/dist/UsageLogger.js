"use strict";
/**
 * @x402/unlocker - Usage and double-spend tracking (JSON file storage)
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
exports.UsageLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_STORAGE_DIR = '.x402';
const USAGE_LOG_FILE = 'usage.json';
const USED_TX_FILE = 'used-tx.json';
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
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
class UsageLogger {
    constructor(options = {}) {
        const base = options.storagePath
            ? path.resolve(options.storagePath)
            : path.join(process.cwd(), DEFAULT_STORAGE_DIR);
        this.usagePath = path.join(base, USAGE_LOG_FILE);
        this.usedTxPath = path.join(base, USED_TX_FILE);
    }
    /** Log a usage event (payment + resource access). */
    log(entry) {
        const logs = readJson(this.usagePath, []);
        logs.push(entry);
        writeJson(this.usagePath, logs);
    }
    /** Record a tx hash as used to prevent double spending. */
    markTxUsed(txHash) {
        const set = readJson(this.usedTxPath, {});
        set[txHash.toLowerCase()] = true;
        writeJson(this.usedTxPath, set);
    }
    /** Check if a tx hash was already used. */
    isTxUsed(txHash) {
        const set = readJson(this.usedTxPath, {});
        return !!set[txHash.toLowerCase()];
    }
    /** Async version for PaymentVerifier. */
    async isTxUsedAsync(txHash) {
        return Promise.resolve(this.isTxUsed(txHash));
    }
    /** Get all usage logs (for admin/debug). */
    getLogs() {
        return readJson(this.usagePath, []);
    }
}
exports.UsageLogger = UsageLogger;
//# sourceMappingURL=UsageLogger.js.map