import { v4 } from 'uuid';

export type SyncFn<x = any> = (p?: x) => void;
export type AsyncFn<x = any> = (p?: x) => Promise<void>;
export type Fn<x = any> = SyncFn<x> | AsyncFn<x>;


type TimerOptions = {
    milliseconds?: number,
    seconds?: number,
    minutes?: number,
    hours?: number,
    days?: number,
}

export enum JobStatus {
    NOT_STARTED = 'NOT_STARTED',
    RUNNING = 'RUNNING',
    STOPPED = 'STOPPED'
}


export abstract class Job {
    public readonly id: string;

    protected readonly fn: Fn;
    protected readonly errorHandler: Fn<Error>;

    public status: JobStatus;

    private readonly runAtStart: boolean;
    private timerId: NodeJS.Timer;
    private readonly timerDuration: number;

    private readonly MAX_DELAY = 2147483647;

    public constructor(
        fn: SyncFn,
        timerOptions: TimerOptions,
        id?: string,
        errorHandler?: Fn<Error>,
        runAtStart = true
    ) {
        this.fn = fn;
        this.id = id || v4();
        this.errorHandler = errorHandler || this.defaultErrorHandler();

        this.runAtStart = runAtStart;

        this.timerDuration = this.getMilliseconds(timerOptions);
        if (this.timerDuration >= this.MAX_DELAY) {
            throw new Error(`Error in creating Job : "${this.id}". Time delays greater than or equal to 2147483647 are not supported yet`);
        }
        this.status = JobStatus.NOT_STARTED;
    }

    private getMilliseconds(options: TimerOptions) {
        const {
            milliseconds = 0,
            seconds = 0,
            minutes = 0,
            hours = 0,
            days = 0,
        } = options;

        return milliseconds * 1
            + seconds * 1000
            + minutes * 60 * 1000
            + hours * 60 * 60 * 1000
            + days * 24 * 60 * 60 * 1000;
    }

    private defaultErrorHandler(): Fn<Error> {
        return (e: Error): void => {
            console.log(`Error in running task with id : ${this.id} with error - ${e.message}`);
        }
    }

    protected abstract handle(): void;

    /**
    * Start a job or restart a job if already running
    *  */
    start(): void {
        this.timerId ? this.stop() : null;

        if (this.runAtStart) {
            this.handle();
        }
        this.timerId = setInterval(() => this.handle(), this.timerDuration);
        this.status = JobStatus.RUNNING;
    }

    stop(): void {
        if (!this.timerId) {
            return;
        }
        clearInterval(this.timerId);
        this.status = JobStatus.STOPPED;
        this.timerId = undefined;
    }
}

export class JobSync extends Job {

    protected readonly fn: SyncFn;

    handle() {
        try {
            this.fn(); 
        }
        catch (e) {
            this.errorHandler(e);
        }
    }

}

export class JobAsync extends Job {

    protected readonly fn: AsyncFn;

    handle() {
        this.fn().catch(this.errorHandler);
    }
}
