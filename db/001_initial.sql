BEGIN;
CREATE TABLE IF NOT EXISTS products (
 id uuid PRIMARY KEY, name text NOT NULL, kind text NOT NULL DEFAULT 'generic', target integer NOT NULL CHECK(target>0),
 include_shipping boolean NOT NULL DEFAULT false, paused boolean NOT NULL DEFAULT false,
 latched boolean NOT NULL DEFAULT false, episode integer NOT NULL DEFAULT 0, last_alert timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS offers (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 store text NOT NULL, url text NOT NULL, price integer NOT NULL DEFAULT 0 CHECK(price>=0),
 shipping integer CHECK(shipping>=0), available boolean NOT NULL DEFAULT false,
 checked_at timestamptz, error text, UNIQUE(product_id,url)
);
CREATE TABLE IF NOT EXISTS price_samples (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
 price integer NOT NULL CHECK(price>0), shipping integer, available boolean NOT NULL, collected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS samples_offer_time ON price_samples(offer_id,collected_at DESC);
CREATE TABLE IF NOT EXISTS settings (
 id integer PRIMARY KEY CHECK(id=1), email text NOT NULL DEFAULT '', email_enabled boolean NOT NULL DEFAULT false,
 telegram_chat_id text NOT NULL DEFAULT '', telegram_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO settings(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS notifications (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 episode integer NOT NULL, name text NOT NULL, price integer NOT NULL, target integer NOT NULL,
 url text NOT NULL, channel text NOT NULL CHECK(channel IN ('email','telegram')),
 destination text NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz, error text, UNIQUE(product_id,episode,channel)
);
CREATE INDEX IF NOT EXISTS notifications_pending ON notifications(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS login_limit (id integer PRIMARY KEY CHECK(id=1), started_at timestamptz NOT NULL, attempts integer NOT NULL);
COMMIT;
