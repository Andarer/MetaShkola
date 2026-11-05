import { useState } from "react";
import {
  Users,
  MessageSquare,
  ThumbsUp,
  Heart,
  Lightbulb,
  GraduationCap,
  Pin,
  Send,
  PlusCircle,
  Flag,
  Share2,
  Trash2,
  ShieldAlert,
  Sparkles,
  Search,
} from "lucide-react";
import { Avatar, Btn, Card, controlClass, Field, Modal } from "@/components/ms/ui";
import { useMs } from "@/lib/ms/store";
import type { CommunityPost, PostKind, PostReaction, PostVisibility } from "@/lib/ms/types";

export function CommunityScreen() {
  const data = useMs((s) => s.data);
  const profile = data.profiles.find((p) => p.id === data.activeProfileId);
  const addPost = useMs((s) => s.addPost);
  const deletePost = useMs((s) => s.deletePost);
  const toggleReaction = useMs((s) => s.toggleReaction);
  const addPostComment = useMs((s) => s.addPostComment);
  const reportContent = useMs((s) => s.reportContent);
  const joinCommunityGroup = useMs((s) => s.joinCommunityGroup);
  const leaveCommunityGroup = useMs((s) => s.leaveCommunityGroup);

  const [activeTab, setActiveTab] = useState<"feed" | "groups" | "announcements">("feed");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create post modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postKind, setPostKind] = useState<PostKind>("post");
  const [postVisibility, setPostVisibility] = useState<PostVisibility>("school");
  const [postTags, setPostTags] = useState("");

  // Comment input state per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Report modal state
  const [reportModal, setReportModal] = useState<{ open: boolean; targetType: "post" | "comment"; targetId: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const groups = data.communityGroups || [];
  const posts = data.communityPosts || [];

  const filteredPosts = posts
    .filter((post) => {
      if (activeTab === "announcements" && post.kind !== "announcement") return false;
      if (selectedGroup !== "all" && post.communityId !== selectedGroup) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          post.content.toLowerCase().includes(q) ||
          (post.title && post.title.toLowerCase().includes(q)) ||
          post.authorName.toLowerCase().includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !postContent.trim()) return;

    addPost({
      communityId: selectedGroup !== "all" ? selectedGroup : undefined,
      spaceId: data.activeSpaceId,
      authorId: profile.id,
      authorName: profile.name,
      authorTone: profile.tone,
      kind: postKind,
      title: postTitle.trim() || undefined,
      content: postContent.trim(),
      visibility: postVisibility,
      tags: postTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    });

    setPostTitle("");
    setPostContent("");
    setPostTags("");
    setCreateOpen(false);
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!profile || !text) return;
    addPostComment(postId, profile.id, profile.name, profile.tone, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleSendReport = () => {
    if (!reportModal || !profile || !reportReason.trim()) return;
    reportContent(reportModal.targetType, reportModal.targetId, profile.id, reportReason.trim());
    setReportModal(null);
    setReportReason("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <Users className="h-7 w-7 text-copper" />
            <span>MetaCommunity</span>
          </h1>
          <p className="text-sm text-muted">
            Единое образовательное и социальное пространство для школы, класса и семьи
          </p>
        </div>
        <Btn
          variant="primary"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Создать публикацию</span>
        </Btn>
      </header>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-surface border border-line">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "feed" ? "bg-copper text-copper-fg" : "text-muted hover:text-fg"
            }`}
          >
            Лента событий
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("announcements")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "announcements" ? "bg-copper text-copper-fg" : "text-muted hover:text-fg"
            }`}
          >
            Объявления
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "groups" ? "bg-copper text-copper-fg" : "text-muted hover:text-fg"
            }`}
          >
            Сообщества ({groups.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            className={`${controlClass} pl-8 text-xs h-9`}
            placeholder="Поиск по публикациям и темам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Groups View */}
      {activeTab === "groups" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((group) => {
            const isMember = profile ? group.memberIds.includes(profile.id) : false;
            return (
              <Card key={group.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={group.name} tone={group.avatarTone} />
                      <div>
                        <h3 className="font-bold text-fg">{group.name}</h3>
                        <p className="text-xs text-muted">
                          {group.kind === "class"
                            ? "Класс"
                            : group.kind === "club"
                            ? "Учебный клуб"
                            : "Семейное пространство"} · {group.memberIds.length} участников
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted leading-relaxed">{group.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                  <span className="text-[11px] text-muted">
                    {group.isPrivate ? "🔒 Закрытое" : "🌐 Открытое для школы"}
                  </span>
                  {profile ? (
                    <button
                      type="button"
                      onClick={() =>
                        isMember
                          ? leaveCommunityGroup(group.id, profile.id)
                          : joinCommunityGroup(group.id, profile.id)
                      }
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        isMember
                          ? "bg-surface-2 text-muted hover:bg-clay/20 hover:text-clay"
                          : "bg-copper text-copper-fg hover:brightness-110"
                      }`}
                    >
                      {isMember ? "Вы состоите" : "Вступить"}
                    </button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Posts Feed View */}
      {activeTab !== "groups" ? (
        <div className="flex flex-col gap-3">
          {filteredPosts.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-sm text-muted">Публикаций пока нет. Будьте первыми, кто поделится новостью!</p>
            </Card>
          ) : (
            filteredPosts.map((post) => {
              const userLiked = profile ? post.reactions.some((r) => r.profileId === profile.id) : false;
              const commentsOpen = openComments[post.id] ?? false;

              return (
                <Card key={post.id} className="flex flex-col gap-3">
                  {/* Post Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={post.authorName} tone={post.authorTone} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-fg">{post.authorName}</span>
                          {post.pinned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-copper">
                              <Pin className="h-3 w-3" /> Закреплено
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted">
                          {new Date(post.createdAt).toLocaleString()} · {post.visibility}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {profile && (profile.id === post.authorId || profile.isProjectCreator) ? (
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          className="p-1.5 text-muted hover:text-clay rounded-lg hover:bg-surface-2 transition-colors"
                          title="Удалить публикацию"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setReportModal({ open: true, targetType: "post", targetId: post.id })}
                        className="p-1.5 text-muted hover:text-amber-500 rounded-lg hover:bg-surface-2 transition-colors"
                        title="Пожаловаться"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div>
                    {post.title ? <h3 className="font-bold text-base text-fg mb-1">{post.title}</h3> : null}
                    <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">{post.content}</p>

                    {/* Tags */}
                    {post.tags.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Post Reactions & Action bar */}
                  <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      {([
                        { type: "like", icon: ThumbsUp, label: "👍" },
                        { type: "heart", icon: Heart, label: "❤️" },
                        { type: "light", icon: Lightbulb, label: "💡" },
                        { type: "grad", icon: GraduationCap, label: "🎓" },
                      ] as const).map(({ type, label }) => {
                        const count = post.reactions.filter((r) => r.type === type).length;
                        const isReacted = profile ? post.reactions.some((r) => r.profileId === profile.id && r.type === type) : false;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => profile && toggleReaction(post.id, profile.id, type)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                              isReacted ? "bg-copper/20 text-copper font-bold" : "hover:bg-surface-2 text-muted"
                            }`}
                          >
                            <span>{label}</span>
                            {count > 0 ? <span className="tabular-nums font-semibold">{count}</span> : null}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenComments((prev) => ({ ...prev, [post.id]: !commentsOpen }))
                      }
                      className="inline-flex items-center gap-1.5 text-muted hover:text-fg text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{post.commentsCount || 0} комментариев</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {commentsOpen ? (
                    <div className="mt-2 rounded-xl border border-line bg-surface-2/40 p-3 space-y-3">
                      {/* Comments list */}
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-2 text-xs">
                              <Avatar name={comment.authorName} tone={comment.authorTone} />
                              <div className="flex-1 rounded-xl bg-surface p-2 border border-line/60">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-fg">{comment.authorName}</span>
                                  <span className="text-[10px] text-muted">
                                    {new Date(comment.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="mt-1 text-fg leading-relaxed">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted text-center py-1">Пока нет комментариев</p>
                      )}

                      {/* Add Comment Input */}
                      {profile ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className={`${controlClass} text-xs h-9 flex-1`}
                            placeholder="Написать комментарий..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(post.id);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-copper px-3 text-xs font-bold text-copper-fg hover:brightness-110"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {/* Modal: Create Post */}
      {createOpen ? (
        <Modal open={createOpen} title="Новая публикация" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
            <Field label="Заголовок (необязательно)">
              <input
                type="text"
                className={controlClass}
                placeholder="Например: Вопрос по алгебре или объявление..."
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
            </Field>

            <Field label="Текст публикации *">
              <textarea
                className={`${controlClass} min-h-24`}
                placeholder="Поделитесь новостью, учебной заметкой или вопросом..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Тип записи">
                <select
                  className={controlClass}
                  value={postKind}
                  onChange={(e) => setPostKind(e.target.value as PostKind)}
                >
                  <option value="post">Обычный пост</option>
                  <option value="announcement">Объявление</option>
                  <option value="question">Учебный вопрос</option>
                  <option value="note">Заметка</option>
                  <option value="achievement">Достижение</option>
                </select>
              </Field>

              <Field label="Видимость">
                <select
                  className={controlClass}
                  value={postVisibility}
                  onChange={(e) => setPostVisibility(e.target.value as PostVisibility)}
                >
                  <option value="class">Класс</option>
                  <option value="school">Вся школа</option>
                  <option value="family">Только семья</option>
                  <option value="only_me">Только я</option>
                </select>
              </Field>
            </div>

            <Field label="Теги (через запятую)">
              <input
                type="text"
                className={controlClass}
                placeholder="математика, 7А, проект"
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
              />
            </Field>

            <div className="mt-3 flex justify-end gap-2">
              <Btn variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
                Отмена
              </Btn>
              <Btn variant="primary" type="submit">
                Опубликовать
              </Btn>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Modal: Report Content */}
      {reportModal ? (
        <Modal open={reportModal.open} title="Пожаловаться на материал" onClose={() => setReportModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              Команда модераторов проверит публикацию на соблюдение правил безопасности сообщества MetaШколы.
            </p>
            <Field label="Причина жалобы *">
              <textarea
                className={`${controlClass} min-h-20`}
                placeholder="Опишите, что нарушает данная запись..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 mt-2">
              <Btn variant="ghost" onClick={() => setReportModal(null)}>
                Отмена
              </Btn>
              <Btn variant="danger" onClick={handleSendReport}>
                Отправить жалобу
              </Btn>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
