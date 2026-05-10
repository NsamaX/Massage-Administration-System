"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "../api/actions";
import { ROLE_LABEL, type AuthUser } from "../schema";

const THAI_LEADING_VOWELS = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ']);

function firstConsonant(name: string): string {
  for (const ch of name) {
    if (!THAI_LEADING_VOWELS.has(ch)) return ch;
  }
  return name[0] ?? '?';
}

type Props = { users: AuthUser[] };

export function SignInForm({ users }: Props) {
  const [state, action, pending] = useActionState(signIn, { error: null });
  const [pin, setPin] = useState("");
  const [selectedUser, setSelectedUser] = useState<AuthUser>(users[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const maxPin = 4;
  const formRef = useRef<HTMLFormElement>(null);

  const pinDots = useMemo(
    () => Array.from({ length: maxPin }).map((_, i) => i < pin.length),
    [pin]
  );

  useEffect(() => {
    if (pin.length === maxPin && !pending) {
      formRef.current?.requestSubmit();
    }
  }, [pin, pending]);

  useEffect(() => {
    if (state.error) {
      setPin("");
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [state]);

  function appendDigit(digit: string) {
    setPin((prev) => (prev.length >= maxPin ? prev : prev + digit));
  }

  return (
    <form ref={formRef} action={action} style={{ width: "100%", maxWidth: "380px" }}>
      <input type="hidden" name="userId" value={selectedUser?.id ?? ""} />
      <input type="hidden" name="pin" value={pin} />

      {/* User selector */}
      <div className="who-sel">
        <span className="caps lbl">เลือกผู้ใช้งาน</span>

        <div style={{ position: "relative" }}>
          <button type="button" className="who-card" onClick={() => setDropdownOpen((v) => !v)}>
            <div className="av" style={{ fontStyle: "normal" }}>{selectedUser ? firstConsonant(selectedUser.name) : "?"}</div>
            <div className="info">
              <div className="nm">{selectedUser?.name}</div>
              <div className="rl">{selectedUser ? ROLE_LABEL[selectedUser.role] : ""}</div>
            </div>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div className="who-dropdown">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="who-dropdown-item"
                    onClick={() => {
                      setSelectedUser(u);
                      setDropdownOpen(false);
                      setPin("");
                    }}
                  >
                    <div className="av-sm" style={{ fontStyle: "normal" }}>{firstConsonant(u.name)}</div>
                    <div>
                      <div style={{ fontSize: "13.5px", color: "var(--ink)", fontWeight: 500 }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "1px", fontFamily: "var(--font-ibm-plex), sans-serif", letterSpacing: 0 }}>
                        {ROLE_LABEL[u.role]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* PIN dots */}
      <div className="pin-prompt">กรอกรหัส PIN 4 หลัก</div>
      <div className={`pin-dots${shake ? " shake" : ""}`}>
        {pinDots.map((filled, idx) => (
          <div
            key={idx}
            className={`pin-dot${filled ? (state.error ? " err" : " fill") : ""}`}
          />
        ))}
      </div>

      {state.error && (
        <div className="login-error">{state.error}</div>
      )}

      {/* Keypad */}
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            className="key"
            onClick={() => appendDigit(d)}
            disabled={pending}
          >
            {d}
          </button>
        ))}

        <button type="button" className="key action" disabled aria-hidden />

        <button
          type="button"
          className="key"
          onClick={() => appendDigit("0")}
          disabled={pending}
        >
          0
        </button>

        <button
          type="button"
          className="key action"
          onClick={() => setPin("")}
          disabled={pending}
        >
          ล้าง
        </button>
      </div>
    </form>
  );
}
