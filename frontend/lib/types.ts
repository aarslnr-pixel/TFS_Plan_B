export type UploadResponse = {
  session_id: string;
  preview_url: string;
  preview_w: number;
  preview_h: number;
  original_w: number;
  original_h: number;
};

export type Stroke = {
  brush: number;
  points: [number, number][];
};

export type StrokePayload = {
  preview_w: number;
  preview_h: number;
  strokes: Stroke[];
  inpaint_radius: number;
};

export type JobInfo = {
  job_id: string;
  session_id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  created_at: string;
  updated_at: string;
  result_url: string | null;
  mask_url: string | null;
  outside_diff: number | null;
  passed_qc: boolean | null;
  error: string | null;
};
