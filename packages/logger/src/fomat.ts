import { format } from "winston";
import type { FormatWrap } from "logform";
import type { IGenericLogger } from "./interface";
import { ORIGIN_ARGS, ORIGIN_ERROR } from "./constant";

export const displayCommonMessage: FormatWrap = format(
  (
    info,
    opts: {
      defaultLabel?: string;
      defaultMeta?: Record<string, unknown>;
      target?: IGenericLogger;
    },
  ) => {
    if (!info.pid) {
      info.pid = process.pid;
    }

    if (info[ORIGIN_ERROR as any]) {
      info.originError = info[ORIGIN_ERROR as any];
    }

    if (info[ORIGIN_ARGS as any]) {
      info.originArgs = info[ORIGIN_ARGS as any];
    }

    if (!info.ignoreFormat) {
      info.ignoreFormat = false;
    }

    if (!info.ctx) {
      info.ctx = null;
    }

    if (!info.format) {
      info.format = null;
    }

    if (!info.LEVEL) {
      info.LEVEL = info.level.toUpperCase();
    }
    if (!info.defaultLabel) {
      info.defaultLabel = opts.defaultLabel || "";
    }
    return Object.assign(info, opts.defaultMeta);
  },
);

function joinLoggerLabel(labelSplit: any, ...labels: any[]) {
  if (labels.length === 0) {
    return "";
  }
  const newLabels = labels.filter((label) => !!label);
  if (newLabels.length === 0) {
    return "";
  }
  return `[${newLabels.join(labelSplit)}] `;
}

export const displayLabels = format((info, opts) => {
  opts.labelSplit = opts.labelSplit || ":";
  info.labelText = joinLoggerLabel(
    opts.labelSplit,
    info.defaultLabel,
    ...[].concat(info.label),
  );
  return info;
});
