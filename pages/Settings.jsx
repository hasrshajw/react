import React from "react";

export default function Settings() {
  return (
    <div className="page">
      <h1>Settings</h1>
      <p>Manage your dashboard settings.</p>

      <div className="settings-card">
        <div className="setting">
          <div>
            <strong>Notifications</strong>
            <span>Receive notifications about important updates.</span>
          </div>

          <input type="checkbox" defaultChecked />
        </div>

        <div className="setting">
          <div>
            <strong>Email Updates</strong>
            <span>Receive regular updates by email.</span>
          </div>

          <input type="checkbox" defaultChecked />
        </div>

        <div className="setting">
          <div>
            <strong>Dark Mode</strong>
            <span>Use dark mode throughout the dashboard.</span>
          </div>

          <input type="checkbox" />
        </div>
      </div>

      <style>{`
        .page {
          max-width: 1400px;
          margin: 0 auto;
        }

        h1 {
          margin: 0;
          font-size: 28px;
        }

        p {
          color: #777;
        }

        .settings-card {
          margin-top: 30px;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 14px;
          overflow: hidden;
        }

        .setting {
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #eee;
        }

        .setting:last-child {
          border-bottom: none;
        }

        .setting div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .setting span {
          color: #888;
          font-size: 13px;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
