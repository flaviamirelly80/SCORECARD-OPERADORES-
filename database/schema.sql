CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, name TEXT NOT NULL, role VARCHAR(30) NOT NULL CHECK (role IN ('operator', 'coordinator')),
  job_title TEXT, area TEXT, shift TEXT, coordinator_id UUID REFERENCES users(id), active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE, last_login TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coordinator_only_for_operator CHECK (coordinator_id IS NULL OR role = 'operator')
);
CREATE INDEX idx_users_coordinator ON users(coordinator_id);
CREATE INDEX idx_users_role_active ON users(role, active);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), date DATE NOT NULL, hours TEXT, observation TEXT,
  status TEXT NOT NULL CHECK (status IN ('Dia compensado','Falta Injustificada','Falta justificada','Férias','Afastado','Folga','Hora extra','Saiu mais cedo','Atraso','Banco de horas','Horário administrativo','Folga aniversariante','Aula Teórica (Jovem Aprendiz)')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);

CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), date DATE NOT NULL, label_number TEXT,
  category TEXT, description TEXT, status TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_labels_user_date ON labels(user_id, date);

CREATE TABLE bos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), date DATE NOT NULL, bos_number TEXT,
  description TEXT, status TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bos_user_date ON bos(user_id, date);

CREATE TABLE bosq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), date DATE NOT NULL, bosq_number TEXT,
  description TEXT, status TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bosq_user_date ON bosq(user_id, date);

CREATE TABLE improvement_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), date DATE NOT NULL, title TEXT NOT NULL,
  description TEXT, status TEXT, result TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ideas_user_date ON improvement_ideas(user_id, date);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), indicator TEXT NOT NULL,
  year INTEGER NOT NULL, month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12), target NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, indicator, year, month), CHECK (indicator IN ('LABELS','BOS','BOSQ','IDEAS'))
);

CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), file_name TEXT NOT NULL, imported_by UUID NOT NULL REFERENCES users(id), imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  records_found INTEGER NOT NULL DEFAULT 0, records_inserted INTEGER NOT NULL DEFAULT 0, records_updated INTEGER NOT NULL DEFAULT 0, records_failed INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL
);
CREATE INDEX idx_import_logs_user_date ON import_logs(imported_by, imported_at);