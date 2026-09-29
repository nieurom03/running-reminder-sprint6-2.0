import type { AppLanguage } from "@/store/useAppStore";

export type LegalDocument = {
  updated: string;
  intro: string;
  sections: { title: string; body: string }[];
};

const privacy: Record<AppLanguage, LegalDocument> = {
  vi: {
    updated: "Cập nhật ngày 28/09/2026",
    intro:
      "Runmio được thiết kế để dữ liệu chạy bộ của bạn được lưu riêng tư trên thiết bị.",
    sections: [
      {
        title: "Dữ liệu được xử lý",
        body: "Ứng dụng xử lý thông tin giáo án, lịch tập, kết quả, ghi chú và cài đặt bạn nhập. Khi bạn chủ động ghi một hoạt động, Runmio xử lý vị trí chính xác, lộ trình, thời gian, cự ly và độ cao để tạo kết quả chạy.",
      },
      {
        title: "Cách dữ liệu được sử dụng",
        body: "Dữ liệu được dùng để tạo và hiển thị giáo án, đo hoạt động GPS, tính tiến độ và gửi thông báo nhắc tập theo lựa chọn của bạn.",
      },
      {
        title: "Lưu trữ và chia sẻ",
        body: "Dữ liệu ứng dụng được lưu cục bộ trên thiết bị. Runmio không bán dữ liệu, không theo dõi bạn cho quảng cáo và không tự động gửi dữ liệu lên máy chủ của nhà phát triển. Khi bạn dùng Nhóm chạy, tên hiển thị, lời mời nhóm, pace hiện tại, giáo án nhóm và kết quả bạn chủ động chia sẻ được truyền trực tiếp tới thiết bị ở gần đã kết nối; dữ liệu nhận được được lưu trong nhóm trên thiết bị đó. File sao lưu chỉ được tạo và chia sẻ khi bạn yêu cầu; bạn chịu trách nhiệm bảo vệ file và mật khẩu sao lưu. Khi gửi phản hồi, nội dung và thông tin phiên bản chỉ được chuyển tới ứng dụng liên lạc do bạn chọn.",
      },
      {
        title: "Quyền truy cập",
        body: "Quyền vị trí chỉ được dùng khi ghi hoạt động, bao gồm ghi nền nếu bạn cho phép để tiếp tục đo khi khóa màn hình. Quyền thông báo được dùng để nhắc workout. Quyền mạng cục bộ được dùng để tìm, mời và trao đổi kết quả với thiết bị ở gần khi bạn mở Nhóm chạy. Bạn có thể thay đổi các quyền này bất cứ lúc nào trong Cài đặt của thiết bị.",
      },
      {
        title: "Kiểm soát dữ liệu",
        body: "Bạn có thể chỉnh sửa hoặc xóa giáo án, workout và kết quả trong ứng dụng. Gỡ cài đặt sẽ xóa dữ liệu cục bộ, nhưng không xóa các file sao lưu bạn đã xuất ra ngoài ứng dụng.",
      },
      {
        title: "Liên hệ và thay đổi",
        body: "Chính sách này có thể được cập nhật khi tính năng của Runmio thay đổi. Nếu có câu hỏi về quyền riêng tư, hãy dùng mục Góp ý & báo lỗi trong Settings.",
      },
    ],
  },
  en: {
    updated: "Updated September 28, 2026",
    intro:
      "Runmio is designed to keep your running data private and stored on your device.",
    sections: [
      {
        title: "Data we process",
        body: "The app processes the training plans, schedules, results, notes, and settings you enter. When you choose to record an activity, Runmio processes precise location, route, time, distance, and elevation data to create your run result.",
      },
      {
        title: "How data is used",
        body: "Your data is used to create and display training plans, record GPS activities, calculate progress, and send workout reminders you request.",
      },
      {
        title: "Storage and sharing",
        body: "App data is stored locally on your device. Runmio does not sell data, track you for advertising, or automatically send your data to a developer-operated server. When you use Running Groups, your display name, group invitation, current pace, group training plan, and any result you choose to share are sent directly to connected nearby devices; received data is stored in that group on the recipient's device. A backup file is created and shared only when you request it; you are responsible for protecting the file and its password. When you send feedback, its content and version information go only to the communication app you select.",
      },
      {
        title: "Permissions",
        body: "Location permission is used only while recording an activity, including background recording when you allow it so measurement can continue with the screen locked. Notification permission is used for workout reminders. Local network permission is used to discover, invite, and exchange results with nearby devices while you use Running Groups. You can change these permissions at any time in your device settings.",
      },
      {
        title: "Your controls",
        body: "You can edit or delete plans, workouts, and results in the app. Uninstalling the app removes local data, but it does not remove backup files you previously exported outside the app.",
      },
      {
        title: "Contact and changes",
        body: "This policy may be updated as Runmio's features change. For privacy questions, use Feedback & bug report in Settings.",
      },
    ],
  },
};

const terms: Record<AppLanguage, LegalDocument> = {
  vi: {
    updated: "Có hiệu lực từ ngày 27/09/2026",
    intro: "Khi sử dụng Runmio, bạn đồng ý với các điều khoản dưới đây.",
    sections: [
      {
        title: "Mục đích ứng dụng",
        body: "Runmio cung cấp công cụ lập giáo án, ghi hoạt động và theo dõi tiến độ chạy bộ cho mục đích thông tin và cá nhân.",
      },
      {
        title: "Sức khỏe và an toàn",
        body: "Runmio không cung cấp tư vấn y tế và không thay thế bác sĩ hoặc huấn luyện viên có chuyên môn. Giáo án và chỉ số chỉ là gợi ý. Hãy đánh giá thể trạng, điều kiện đường chạy và thời tiết; dừng tập và tìm hỗ trợ y tế nếu bạn thấy đau, chóng mặt, khó thở hoặc có dấu hiệu bất thường.",
      },
      {
        title: "Trách nhiệm của bạn",
        body: "Bạn chịu trách nhiệm về thông tin nhập vào, việc cấp quyền vị trí và thông báo, cách sử dụng giáo án, cũng như việc bảo vệ thiết bị, file sao lưu và mật khẩu của mình. Không sử dụng ứng dụng theo cách trái pháp luật hoặc gây hại cho người khác.",
      },
      {
        title: "Tính khả dụng và dữ liệu",
        body: "Ứng dụng được cung cấp theo hiện trạng. GPS, thông báo, bản đồ và sao lưu có thể bị ảnh hưởng bởi thiết bị, hệ điều hành, tín hiệu hoặc dịch vụ bên thứ ba. Bạn nên tạo bản sao lưu phù hợp; Runmio không đảm bảo dữ liệu sẽ luôn không bị gián đoạn hoặc mất mát.",
      },
      {
        title: "Giới hạn trách nhiệm",
        body: "Trong phạm vi pháp luật cho phép, nhà phát triển không chịu trách nhiệm cho chấn thương, thiệt hại gián tiếp, mất dữ liệu hoặc tổn thất phát sinh từ việc sử dụng hay không thể sử dụng ứng dụng.",
      },
      {
        title: "Thay đổi và liên hệ",
        body: "Điều khoản có thể được cập nhật khi ứng dụng thay đổi. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn chấp nhận phiên bản mới. Nếu có câu hỏi, hãy dùng mục Góp ý & báo lỗi trong Settings.",
      },
    ],
  },
  en: {
    updated: "Effective September 27, 2026",
    intro: "By using Runmio, you agree to the terms below.",
    sections: [
      {
        title: "Purpose of the app",
        body: "Runmio provides tools for building training plans, recording activities, and tracking running progress for personal and informational purposes.",
      },
      {
        title: "Health and safety",
        body: "Runmio does not provide medical advice and is not a substitute for a qualified doctor or coach. Plans and metrics are suggestions only. Consider your fitness, route conditions, and weather; stop exercising and seek medical help if you experience pain, dizziness, breathing difficulty, or other unusual symptoms.",
      },
      {
        title: "Your responsibilities",
        body: "You are responsible for the information you enter, the location and notification permissions you grant, how you use a plan, and the security of your device, backup files, and passwords. Do not use the app unlawfully or in a way that harms others.",
      },
      {
        title: "Availability and data",
        body: "The app is provided as available. GPS, notifications, maps, and backups may be affected by your device, operating system, signal, or third-party services. You should keep appropriate backups; Runmio does not guarantee uninterrupted operation or protection from all data loss.",
      },
      {
        title: "Limitation of liability",
        body: "To the extent permitted by law, the developer is not responsible for injury, indirect damage, data loss, or other loss resulting from use of, or inability to use, the app.",
      },
      {
        title: "Changes and contact",
        body: "These terms may be updated as the app changes. Continued use after an update means you accept the revised terms. If you have questions, use Feedback & bug report in Settings.",
      },
    ],
  },
};

export function getLegalDocument(
  type: "privacy" | "terms",
  language: AppLanguage,
) {
  return (type === "privacy" ? privacy : terms)[language];
}
