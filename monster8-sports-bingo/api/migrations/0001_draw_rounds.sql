-- Monster #8: Bingo Bingo Draw Rounds
CREATE TABLE draw_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id TEXT UNIQUE NOT NULL,
  draw_time DATETIME NOT NULL,
  numbers TEXT NOT NULL,
  super_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_draw_rounds_status ON draw_rounds(status);
CREATE INDEX idx_draw_rounds_draw_time ON draw_rounds(draw_time);
