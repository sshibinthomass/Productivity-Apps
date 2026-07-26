export default function NetworkSignal() {
  return (
    <div className="network-signal" aria-hidden="true">
      <span className="network-signal__label network-signal__label--active">
        ACTIVE / 01
      </span>
      <span className="network-signal__label network-signal__label--future">
        ANNOUNCED / 03
      </span>
      <span className="network-signal__frame" />
      <span className="network-signal__path network-signal__path--a" />
      <span className="network-signal__path network-signal__path--b" />
      <span className="network-signal__path network-signal__path--c" />
      <span className="network-signal__node network-signal__node--active" />
      <span className="network-signal__node network-signal__node--future-a" />
      <span className="network-signal__node network-signal__node--future-b" />
      <span className="network-signal__node network-signal__node--future-c" />
      <span className="network-signal__focus" />
    </div>
  )
}
