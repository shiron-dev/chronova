// Package seed populates a fresh database with demo data so the UI is
// meaningful on first boot. It is a no-op once any member exists.
package seed

import (
	"fmt"
	"time"

	"github.com/shiron-dev/chronova/backend/internal/model"
	"github.com/shiron-dev/chronova/backend/internal/store"
)

func ptr[T any](v T) *T { return &v }

// Run seeds demo members, projects, and tasks iff the members table is empty.
func Run(s *store.Store) (bool, error) {
	n, err := s.CountMembers()
	if err != nil {
		return false, err
	}
	if n > 0 {
		return false, nil
	}

	members := []store.CreateMemberInput{
		{Name: "佐藤 花子", Type: model.MemberHuman, AvatarColor: "#E0768D"},
		{Name: "田中 太郎", Type: model.MemberHuman, AvatarColor: "#4EA7FC"},
		{Name: "鈴木 美咲", Type: model.MemberHuman, AvatarColor: "#B694F5"},
		{Name: "コードレビューBot", Type: model.MemberAgent, AvatarColor: "#5E6AD2"},
		{Name: "リサーチAgent", Type: model.MemberAgent, AvatarColor: "#26B5A6"},
		{Name: "デプロイAgent", Type: model.MemberAgent, AvatarColor: "#E8B04B"},
	}
	memberIDs := make([]int64, 0, len(members))
	for _, in := range members {
		m, err := s.CreateMember(in)
		if err != nil {
			return false, fmt.Errorf("seed member %q: %w", in.Name, err)
		}
		memberIDs = append(memberIDs, m.ID)
	}

	projects := []store.CreateProjectInput{
		{Name: "ウェブサイトリニューアル", Description: "コーポレートサイトの全面刷新プロジェクト", Color: "#5E6AD2", Icon: "globe"},
		{Name: "モバイルアプリ", Description: "iOS / Android アプリの新規開発", Color: "#26B5A6", Icon: "smartphone"},
		{Name: "インフラ整備", Description: "CI/CD とモニタリング基盤の整備", Color: "#E8B04B", Icon: "server"},
	}
	projectIDs := make([]int64, 0, len(projects))
	for _, in := range projects {
		p, err := s.CreateProject(in)
		if err != nil {
			return false, fmt.Errorf("seed project %q: %w", in.Name, err)
		}
		projectIDs = append(projectIDs, p.ID)
	}

	date := func(days int) *string {
		d := time.Now().AddDate(0, 0, days).Format("2006-01-02")
		return &d
	}

	tasks := []store.CreateTaskInput{
		{Title: "トップページのデザインリニューアル", Description: "ヒーローセクションと主要導線を刷新する。Figma のデザイン案をもとに実装まで行う。", Status: model.StatusInProgress, Priority: model.PriorityHigh, DueDate: date(3), ProjectID: ptr(projectIDs[0]), AssigneeIDs: []int64{memberIDs[0]}},
		{Title: "お問い合わせフォームのバリデーション改善", Description: "入力エラーの文言をわかりやすくし、リアルタイムバリデーションを導入する。", Status: model.StatusTodo, Priority: model.PriorityMedium, DueDate: date(7), ProjectID: ptr(projectIDs[0]), AssigneeIDs: []int64{memberIDs[1], memberIDs[3]}},
		{Title: "旧ページのリダイレクト設定", Description: "旧URLから新URLへの301リダイレクトを網羅的に設定する。", Status: model.StatusBacklog, Priority: model.PriorityLow, ProjectID: ptr(projectIDs[0])},
		{Title: "OGP画像の自動生成", Description: "記事タイトルからOGP画像を動的に生成する仕組みを作る。", Status: model.StatusBacklog, Priority: model.PriorityNone, ProjectID: ptr(projectIDs[0]), AssigneeIDs: []int64{memberIDs[4]}},
		{Title: "アクセシビリティ監査", Description: "WCAG 2.2 AA 準拠のチェックリストで全ページを監査する。", Status: model.StatusDone, Priority: model.PriorityMedium, ProjectID: ptr(projectIDs[0]), AssigneeIDs: []int64{memberIDs[2]}},

		{Title: "プッシュ通知基盤の実装", Description: "FCM を使ったプッシュ通知の送信基盤を実装する。", Status: model.StatusInProgress, Priority: model.PriorityUrgent, DueDate: date(-2), ProjectID: ptr(projectIDs[1]), AssigneeIDs: []int64{memberIDs[1]}},
		{Title: "オンボーディング画面のA/Bテスト", Description: "2パターンのオンボーディングフローを実装し、完了率を比較する。", Status: model.StatusTodo, Priority: model.PriorityHigh, DueDate: date(10), ProjectID: ptr(projectIDs[1]), AssigneeIDs: []int64{memberIDs[0], memberIDs[2]}},
		{Title: "オフラインキャッシュ対応", Description: "ネットワーク断でも直近のデータを閲覧できるようにする。", Status: model.StatusBacklog, Priority: model.PriorityMedium, ProjectID: ptr(projectIDs[1])},
		{Title: "アプリストア用スクリーンショット作成", Description: "リリース申請用のスクリーンショットと説明文を用意する。", Status: model.StatusTodo, Priority: model.PriorityLow, ProjectID: ptr(projectIDs[1]), AssigneeIDs: []int64{memberIDs[4]}},
		{Title: "クラッシュレポートの調査", Description: "起動直後にクラッシュする報告が増えている。スタックトレースを調査して原因を特定する。", Status: model.StatusCanceled, Priority: model.PriorityHigh, ProjectID: ptr(projectIDs[1])},

		{Title: "CI パイプラインの高速化", Description: "テストの並列化とキャッシュ活用でCI時間を半減させる。", Status: model.StatusInProgress, Priority: model.PriorityMedium, ProjectID: ptr(projectIDs[2]), AssigneeIDs: []int64{memberIDs[5]}},
		{Title: "ステージング環境の自動デプロイ", Description: "main ブランチへのマージで自動的にステージングへデプロイする。", Status: model.StatusDone, Priority: model.PriorityHigh, ProjectID: ptr(projectIDs[2]), AssigneeIDs: []int64{memberIDs[5], memberIDs[1]}},
		{Title: "監視アラートのしきい値見直し", Description: "誤検知の多いアラートを整理し、しきい値を再設定する。", Status: model.StatusTodo, Priority: model.PriorityMedium, DueDate: date(5), ProjectID: ptr(projectIDs[2]), AssigneeIDs: []int64{memberIDs[3]}},
		{Title: "バックアップリストア手順の検証", Description: "本番相当データでリストア手順を実際に試し、手順書を更新する。", Status: model.StatusBacklog, Priority: model.PriorityUrgent, DueDate: date(1), ProjectID: ptr(projectIDs[2])},

		{Title: "四半期ロードマップの草案作成", Description: "次四半期の開発ロードマップの草案をまとめ、レビューを依頼する。", Status: model.StatusTodo, Priority: model.PriorityHigh, DueDate: date(-1), AssigneeIDs: []int64{memberIDs[0]}},
		{Title: "競合サービスの機能調査", Description: "主要競合3社の最新機能をリサーチしてレポートにまとめる。", Status: model.StatusInProgress, Priority: model.PriorityLow, AssigneeIDs: []int64{memberIDs[4]}},
	}
	for _, in := range tasks {
		if _, err := s.CreateTask(in); err != nil {
			return false, fmt.Errorf("seed task %q: %w", in.Title, err)
		}
	}
	return true, nil
}
