"use client";

import { useEffect, useRef } from "react";
import { useNextTask } from "@/hooks/useNextTask";
import { useBalance } from "@/contexts/BalanceContext";
import TaskCard from "@/components/TaskCard";
import TaskImage from "@/components/TaskImage";
import Spinner from "@/components/Spinner";

export default function TaskPage() {
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const {
    pendingSol,
    lockedSol,
    rawPendingLamports,
    loadingBalance,
    payingOut,
    payoutMsg,
    balanceError,
    fetchBalance,
    payout,
  } = useBalance();
  const {
    task,
    submission,
    loading,
    submitting,
    done,
    error,
    fetchNextTask,
    submit,
  } = useNextTask(fetchBalance);

  useEffect(() => {
    if (submission) confirmationHeading.current?.focus();
  }, [submission]);

  useEffect(() => {
    void fetchNextTask();
    void fetchBalance();
  }, [fetchNextTask, fetchBalance]);

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-400 text-sm mb-1">Pending Balance</p>
          <p className="text-2xl font-bold text-violet-300">
            {loadingBalance ? "…" : `${pendingSol} SOL`}
          </p>
          {/* Display balance error in the card (fixes issue #7) */}
          {balanceError && (
            <div>
              <p role="alert" className="text-red-400 text-xs mt-1">
                {balanceError}
              </p>
              <button
                onClick={() => void fetchBalance()}
                className="mt-2 underline"
              >
                Refresh balance
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-400 text-sm mb-1">Locked / In-Transit</p>
          <p className="text-2xl font-bold text-zinc-300">
            {loadingBalance ? "…" : `${lockedSol} SOL`}
          </p>
        </div>

        <div className="flex-none bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between min-w-[180px]">
          <p className="text-zinc-400 text-sm mb-2">Payout</p>
          <button
            onClick={payout}
            disabled={
              payingOut ||
              loadingBalance ||
              Boolean(balanceError) ||
              rawPendingLamports <= 0n /* raw bigint check (fixes issue #6) */
            }
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                       disabled:cursor-not-allowed rounded-lg text-white font-semibold text-sm transition"
          >
            {payingOut ? "Processing…" : "Withdraw SOL"}
          </button>
          {payoutMsg && (
            <p role="status" className="text-xs text-zinc-400 mt-2 break-all">
              {payoutMsg}
            </p>
          )}
        </div>
      </div>

      {/* Task Area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {loading && !submission && <Spinner />}

        {submission && (
          <section
            aria-labelledby="submission-heading"
            className="mx-auto max-w-xl space-y-4"
          >
            <h1
              id="submission-heading"
              tabIndex={-1}
              ref={confirmationHeading}
              className="text-2xl font-bold text-white"
            >
              Submission recorded
            </h1>
            <p className="text-lg text-white">{submission.task.title}</p>
            <p className="text-zinc-300">Task ID: {submission.task.id}</p>
            <p className="text-zinc-300">
              Selected option: {submission.option.id}
            </p>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-800">
              <TaskImage
                url={submission.option.image_url}
                optionId={submission.option.id}
              />
            </div>
            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}
            <button
              onClick={() => void fetchNextTask()}
              disabled={loading || submitting}
              className="rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? "Loading next task…" : "Go to next task"}
            </button>
          </section>
        )}

        {!loading && done && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-white mb-2">All done!</h2>
            <p className="text-zinc-400">
              No more tasks available right now. Check back later.
            </p>
            <button
              onClick={fetchNextTask}
              className="mt-6 px-6 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition"
            >
              Refresh
            </button>
          </div>
        )}

        {!loading && error && !submission && (
          <div className="text-center py-20">
            <p role="alert" className="text-red-400 mb-4">
              {error}
            </p>
            <button
              onClick={fetchNextTask}
              className="px-6 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && task && (
          <TaskCard task={task} submitting={submitting} onVote={submit} />
        )}
      </div>
    </div>
  );
}
