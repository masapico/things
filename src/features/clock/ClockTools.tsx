import { useRef, useState } from "react";
import { Button, ButtonGroup, Form, Overlay, Popover } from "react-bootstrap";
import { AlarmClockIcon, ClockIcon, PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon, Trash2Icon } from "lucide-react";
import { formatRemaining, getRemainingMs } from "./clockModel";
import { useClockTools } from "./useClockTools";
import "./ClockTools.css";

type Props = { dateStr: string; hours: string; minutes: string };
const PRESETS = [5, 10, 25, 60];

export function ClockTools({ dateStr, hours, minutes }: Props) {
  const target = useRef<HTMLButtonElement>(null);
  const [show, setShow] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerLabel, setTimerLabel] = useState("");
  const [alarmTime, setAlarmTime] = useState("09:00");
  const [alarmLabel, setAlarmLabel] = useState("");
  const tools = useClockTools();
  const timer = tools.state.timer, alarm = tools.state.alarm;
  const timerRemaining = timer ? getRemainingMs(timer, tools.now) : null;
  const due = timer?.status === "due" || alarm?.status === "due";
  const warning = !due && timer?.status === "running" && timerRemaining !== null && timerRemaining <= 60_000;
  const next = [timer?.status === "running" && timer.dueAt ? { at: timer.dueAt, text: `T ${formatRemaining(timerRemaining ?? 0)}` } : null, alarm?.status === "armed" ? { at: alarm.dueAt, text: `A ${new Date(alarm.dueAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}` } : null].filter((item): item is { at: number; text: string } => !!item).sort((a, b) => a.at - b.at)[0];

  return <>
    <button ref={target} type="button" className={`app-header-clock clock-tools-trigger${due ? " is-due" : warning ? " is-warning" : ""}`} title={dateStr} onClick={() => setShow((value) => !value)} aria-expanded={show}>
      <ClockIcon size={14} className="app-header-clock-icon" />
      <span className="app-header-clock-date">{dateStr}</span>
      <span className="app-header-clock-time">{due ? "確認" : next?.text ?? <>{hours}<span className="app-header-clock-colon">:</span>{minutes}</>}</span>
    </button>
    <Overlay target={target} show={show} placement="bottom-end" rootClose onHide={() => setShow(false)}>
      <Popover className="clock-tools-popover"><Popover.Header>タイマーとアラーム</Popover.Header><Popover.Body>
        <section className={`clock-tool-section${timer?.status === "due" ? " is-due" : ""}`}><div className="clock-tool-title"><TimerIcon size={16} /><strong>タイマー</strong></div>
          {timer ? <><div className="clock-tool-readout">{formatRemaining(timerRemaining ?? 0)}</div>{timer.label && <div className="clock-tool-label">{timer.label}</div>}<ButtonGroup size="sm" className="w-100">{timer.status === "running" ? <Button variant="outline-secondary" onClick={tools.pauseTimer}><PauseIcon size={14} /> 一時停止</Button> : timer.status === "paused" ? <Button variant="outline-primary" onClick={tools.resumeTimer}><PlayIcon size={14} /> 再開</Button> : null}<Button variant="outline-secondary" onClick={tools.resetTimer}><RotateCcwIcon size={14} /> リセット</Button><Button variant="outline-danger" onClick={tools.clearTimer}><Trash2Icon size={14} /></Button></ButtonGroup></> : <><div className="clock-presets">{PRESETS.map((preset) => <Button key={preset} size="sm" variant={timerMinutes === preset ? "primary" : "outline-secondary"} onClick={() => setTimerMinutes(preset)}>{preset}分</Button>)}</div><Form.Control size="sm" type="number" min={1} max={1440} value={timerMinutes} onChange={(event) => setTimerMinutes(Number(event.target.value))} aria-label="タイマー分数" /><Form.Control size="sm" value={timerLabel} onChange={(event) => setTimerLabel(event.target.value)} placeholder="ラベル（任意）" maxLength={80} /><Button size="sm" onClick={() => tools.startTimer(timerMinutes, timerLabel)} disabled={!timerMinutes}>開始</Button></>}
        </section>
        <section className={`clock-tool-section${alarm?.status === "due" ? " is-due" : ""}`}><div className="clock-tool-title"><AlarmClockIcon size={16} /><strong>アラーム</strong></div>
          {alarm ? <><div className="clock-alarm-time">{new Date(alarm.dueAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>{alarm.label && <div className="clock-tool-label">{alarm.label}</div>}<ButtonGroup size="sm" className="w-100">{alarm.status === "due" && <Button variant="warning" onClick={tools.snoozeAlarm}>5分スヌーズ</Button>}<Button variant="outline-danger" onClick={tools.clearAlarm}>解除</Button></ButtonGroup></> : <><Form.Control size="sm" type="time" value={alarmTime} onChange={(event) => setAlarmTime(event.target.value)} /><Form.Control size="sm" value={alarmLabel} onChange={(event) => setAlarmLabel(event.target.value)} placeholder="ラベル（任意）" maxLength={80} /><Button size="sm" variant="outline-primary" onClick={() => tools.setAlarm(alarmTime, alarmLabel)} disabled={!alarmTime}>セット</Button></>}
        </section>
      </Popover.Body></Popover>
    </Overlay>
  </>;
}
