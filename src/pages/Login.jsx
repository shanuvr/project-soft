import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../data/context.js';

const BOOT_LINES = [
  { type: 'ok', text: 'projectsoft-config.service - loaded configuration pms.conf' },
  { type: 'ok', text: 'mounting workspace     - /var/projectsoft/project-soft' },
  { type: 'ok', text: 'projectsoft-route.service - project route resolver started' },
  { type: 'ok', text: 'projectsoft-auth.service - operator gateway up (127.0.0.1:8080)' },
  { type: 'ok', text: 'projectsoft-sprint.service - sprint engine online (12 contributors)' },
  { type: 'ok', text: 'Reached target graphical.target - console interface ready' },
];

function TermInput({ value, onChange, onEnter, secret = false, autoFocus = false, ref: refProp }) {
  const display = secret ? '•'.repeat(value.length) : value;
  return (
    <span
      className="relative inline-block align-middle cursor-text"
      style={{ minWidth: '1ch' }}
      onClick={() => refProp.current && refProp.current.focus()}
    >
      <span className="invisible whitespace-pre" style={{ minWidth: '1ch' }}>
        {display || ' '}
      </span>
      <span className="absolute inset-y-0 left-0 whitespace-pre text-zinc-100">
        {display}
        <span className="terminal-cursor text-zinc-100 inline-block select-none">▉</span>
      </span>
      <input
        ref={refProp}
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={onChange}
        onKeyDown={onEnter}
        autoFocus={autoFocus}
        autoComplete={secret ? 'current-password' : 'username'}
        spellCheck={false}
        className="absolute inset-0 h-full w-full bg-transparent text-transparent caret-transparent outline-none"
      />
    </span>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [bootLines, setBootLines] = useState([]);
  const [booting, setBooting] = useState(true);

  const [step, setStep] = useState('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [promptUser, setPromptUser] = useState('');
  const [loginHistory, setLoginHistory] = useState([]);

  const [authDots, setAuthDots] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [routeTarget, setRouteTarget] = useState('/dev/apps/dashboard');

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const endRef = useRef(null);

  // Stream the boot lines, then hand control to the login prompt.
  useEffect(() => {
    const timers = [];

    const startTimer = setTimeout(() => {
      // Fast stream, but hold on the 3rd line for a beat.
      const delays = [90, 90, 1200, 90, 90, 90];
      let i = 0;
      const showNext = () => {
        if (i >= BOOT_LINES.length) {
          setBooting(false);
          timers.push(setTimeout(() => usernameRef.current && usernameRef.current.focus(), 60));
          return;
        }
        const target = BOOT_LINES[i];
        setBootLines((prev) => {
          if (prev.filter(Boolean).length >= BOOT_LINES.length) return prev;
          return [...prev, target];
        });
        i += 1;
        timers.push(setTimeout(showNext, delays[i] ?? 90));
      };
      timers.push(setTimeout(showNext, 150));
    }, 600);

    timers.push(startTimer);
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Keep the last line in view.
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [bootLines, loginHistory, step, authDots, leaving]);

  // Animate the "Authenticating..." dots, then fade into the dashboard.
  useEffect(() => {
    if (step !== 'authenticating') return;
    let dots = 0;
    const interval = setInterval(() => {
      dots += 1;
      if (dots > 4) {
        clearInterval(interval);
        setLeaving(true);
        setTimeout(() => navigate(routeTarget, { replace: true }), 550);
        return;
      }
      setAuthDots(dots);
    }, 320);
    return () => clearInterval(interval);
  }, [step, navigate, routeTarget]);

  const focusUsername = () => {
    setTimeout(() => usernameRef.current && usernameRef.current.focus(), 40);
  };

  const handleUsernameEnter = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!username.trim()) {
      focusUsername();
      return;
    }
    setPromptUser(username.trim());
    setLoginHistory((prev) => [...prev, { type: 'login', text: username.trim() }]);
    setStep('password');
    setTimeout(() => passwordRef.current && passwordRef.current.focus(), 40);
  };

  const handlePasswordEnter = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const user = login(promptUser, password);

    if (!user) {
      setLoginHistory((prev) => [
        ...prev,
        { type: 'password', length: password.length },
        { type: 'error', text: 'Error: Invalid username or password' },
        { type: 'blank' },
      ]);
      setUsername('');
      setPassword('');
      setStep('username');
      focusUsername();
      return;
    }

    setLoginHistory((prev) => [...prev, { type: 'password', length: password.length }]);
    setRouteTarget(`/${user.role}/apps/dashboard`);
    setAuthDots(0);
    setStep('authenticating');
  };

  return (
    <div className="min-h-full w-full bg-[#050505] text-zinc-300 font-mono text-[14px] leading-relaxed p-4 sm:p-6 flex flex-col select-text">
      {/* Terminal scrollback */}
      <div className="max-w-3xl mx-auto w-full flex-1 overflow-y-auto">
        {/* Boot sequence keeps scrolling, data always stays on screen */}
        {bootLines.filter(Boolean).map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-words">
            {line.type === 'ok' ? (
              <>
                <span className="text-zinc-600">[</span>
                <span className="text-zinc-100 font-semibold">&nbsp;OK&nbsp;</span>
                <span className="text-zinc-600">]</span>
                <span className="text-zinc-300">
                  {' '}
                  {line.text}
                </span>
              </>
            ) : (
              <span className="text-zinc-500">{line.text}</span>
            )}
          </div>
        ))}

        {!booting && (
          <>
            <div className="h-4" />
            <div className="text-zinc-500">Project Soft 5.2.1 (project-soft) tty1</div>
            <div className="text-[11px] text-zinc-700">operator logins: admin / developer</div>
            <div className="h-2" />
          </>
        )}

        {/* Login transcript (kept on screen once typed) */}
        {loginHistory.filter(Boolean).map((item, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-words">
            {item.type === 'login' && (
              <>
                <span className="text-zinc-100">project-soft login: </span>
                <span className="text-zinc-100">{item.text}</span>
              </>
            )}
            {item.type === 'password' && (
              <>
                <span className="text-zinc-100">Password: </span>
                <span className="text-zinc-100">{'•'.repeat(item.length)}</span>
              </>
            )}
            {item.type === 'error' && <span className="text-red-400">{item.text}</span>}
            {item.type === 'blank' && <div className="h-3" />}
          </div>
        ))}

        {/* Interactive login prompt */}
        {!booting && step === 'username' && (
          <div className="whitespace-pre-wrap break-words">
            <span className="text-zinc-100">project-soft login:&nbsp;</span>
            <TermInput
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onEnter={handleUsernameEnter}
              autoFocus
            />
          </div>
        )}

        {!booting && step === 'password' && (
          <>
            <div className="whitespace-pre-wrap break-words">
              <span className="text-zinc-100">Password:&nbsp;</span>
              <TermInput
                ref={passwordRef}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onEnter={handlePasswordEnter}
                secret
                autoFocus
              />
            </div>
          </>
        )}

        {!booting && step === 'authenticating' && (
          <>
            <div className="text-zinc-500">
              Authenticating{'.'.repeat(authDots)}
            </div>
          </>
        )}

        <div ref={endRef} />
      </div>

      {/* Status bar */}
      <div className="max-w-3xl mx-auto w-full pt-3 mt-3 border-t border-zinc-900 text-[11px] text-zinc-600 flex items-center justify-between">
        <span>Project Soft - Programser International</span>
        <span>operator gateway 127.0.0.1:8080</span>
      </div>

      {/* Fade-to-black transition into the dashboard */}
      <div
        className={`fixed inset-0 z-50 bg-black transition-opacity duration-500 ${leaving ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
    </div>
  );
}