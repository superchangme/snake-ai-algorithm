-- 游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
    id BIGSERIAL PRIMARY KEY,
    player_name VARCHAR(64) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    steps INTEGER NOT NULL CHECK (steps >= 0),
    map_size INTEGER NOT NULL,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('ai', 'human')),
    connection VARCHAR(10) NOT NULL CHECK (connection IN ('ws', 'http')),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 扩展字段（JSONB，用于未来特性）
    metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_game_records_player_name ON game_records(player_name);
CREATE INDEX IF NOT EXISTS idx_game_records_map_size ON game_records(map_size);
CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at DESC);

-- 复合索引：排行榜查询优化
-- (map_size, score DESC, steps ASC) - 支持排行榜高效查询
CREATE INDEX IF NOT EXISTS idx_game_records_leaderboard ON game_records(
    map_size, 
    score DESC, 
    steps ASC
);
