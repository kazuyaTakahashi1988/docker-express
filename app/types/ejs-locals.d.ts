export interface UserViewModel {
  id: number;
  name: string;
  email: string;
  image?: string;
}

export interface CategoryViewModel {
  id: number;
  category_name: string;
}

export interface PostViewModel {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  content: string;
  image?: string;
  User?: UserViewModel;
  Category?: CategoryViewModel;
  Likes?: LikeViewModel[];
}

export interface CommentViewModel {
  id: number;
  user_id: number;
  post_id: number;
  comment: string;
  User?: UserViewModel;
  Replies?: ReplyViewModel[];
}

export interface ReplyViewModel {
  id: number;
  user_id: number;
  comment_id: number;
  reply: string;
  User?: UserViewModel;
}

export interface LikeViewModel {
  id: number;
  user_id: number;
  post_id: number;
  Post?: PostViewModel;
}

export interface ValidationErrorViewModel {
  msg: string;
  path?: string;
  param?: string;
}

export interface BaseTemplateLocals {
  user?: UserViewModel;
  errors?: ValidationErrorViewModel[] | string;
  errorMessage?: string;
}

export interface PostListTemplateLocals extends BaseTemplateLocals {
  posts: PostViewModel[];
  count: number;
  pegePath: string;
  pageTitle: string;
  page: number | string;
}

export interface PostDetailTemplateLocals extends BaseTemplateLocals {
  post: PostViewModel;
  comments: CommentViewModel[];
  count: number;
  pegePath: string;
  page: number | string;
  judge: LikeViewModel | false | null;
}
