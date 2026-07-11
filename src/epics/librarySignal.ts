import { Observable } from "rxjs";

type SignalSubscriber<Signal> = (
  listener: (signal: Signal) => void,
) => () => void;

export function observeLibrarySignals<Signal>(
  subscribe: SignalSubscriber<Signal>,
) {
  return new Observable<Signal>((subscriber) =>
    subscribe((signal) => subscriber.next(signal)),
  );
}
