#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'output');

const HASHTAGS = '#Runmio #ChayBo #Running #RunningPlan #TapLuyen #RunnerVietnam';

const TOPICS = [
  {
    theme: 'Khởi động hành trình',
    title: 'Đừng chạy thật nhanh ở ngày đầu tiên',
    feature: 'Create Plan',
    action: 'Tạo mục tiêu tuần trong Runmio và chạy easy 20–30 phút ở mức có thể nói chuyện.',
    hook: 'Tiến bộ khi chạy bộ bắt đầu từ một kế hoạch đủ dễ để bạn duy trì.',
    body: 'Ngày đầu không cần chứng minh tốc độ. Hãy chọn cự ly vừa sức, chạy chậm và kết thúc khi cơ thể vẫn còn năng lượng. Một buổi chạy thành công là buổi chạy khiến bạn muốn quay lại vào ngày mai.',
    visualIdea: 'Quay màn hình tạo giáo án trong Runmio, chuyển sang cảnh mang giày rồi bắt đầu buổi easy run.'
  },
  {
    theme: 'Theo dõi tiến độ',
    title: 'Bạn chỉ cần tốt hơn chính mình của tuần trước',
    feature: 'Dashboard',
    action: 'Mở Dashboard, xem tổng km tuần và ghi lại một mục tiêu nhỏ có thể cải thiện trong tuần này.',
    hook: 'Đừng so pace của bạn với người khác. Hãy so sự đều đặn của bạn với chính bạn.',
    body: 'Tiến độ chạy bộ không chỉ là pace. Tổng số buổi hoàn thành, số km tích lũy và cảm giác sau buổi chạy đều là dữ liệu đáng theo dõi. Tăng từng chút sẽ bền hơn cố tăng thật nhanh.',
    visualIdea: 'Zoom vào vòng tiến độ và biểu đồ km tuần trên Dashboard, chèn chữ “+1% mỗi ngày”.'
  },
  {
    theme: 'Easy Run',
    title: 'Chạy chậm chính là bài tập quan trọng nhất',
    feature: 'Plan',
    action: 'Chọn một buổi Easy Run trong Plan và giữ pace thoải mái trong toàn bộ buổi chạy.',
    hook: 'Nếu buổi nào cũng chạy nhanh, cơ thể sẽ khó có thời gian để mạnh lên.',
    body: 'Easy run giúp bạn tích lũy quãng đường, xây nền aerobic và phục hồi giữa các buổi nặng. Dấu hiệu đơn giản: bạn vẫn nói được câu ngắn mà không hụt hơi.',
    visualIdea: 'Split screen: lịch Easy Run trong Runmio và đoạn chạy ngoài trời với nhịp ổn định.'
  },
  {
    theme: 'Lợi ích chạy bộ',
    title: '30 phút chạy hôm nay có giá trị hơn một kế hoạch hoàn hảo để ngày mai',
    feature: 'Run Reminder',
    action: 'Đặt nhắc chạy trong Runmio cho khung giờ bạn ít bị công việc chen vào nhất.',
    hook: 'Thói quen thắng động lực khi bạn không muốn xỏ giày.',
    body: 'Một lịch nhắc đơn giản giúp giảm số lần bạn phải tự hỏi “hôm nay có chạy không?”. Khi thời gian chạy đã được lên lịch, việc còn lại chỉ là bắt đầu.',
    visualIdea: 'Cảnh bật thông báo nhắc chạy trong Settings rồi chuyển sang đồng hồ đếm thời gian chạy.'
  },
  {
    theme: 'Pace',
    title: 'Pace phù hợp quan trọng hơn pace đẹp',
    feature: 'Workout Pace',
    action: 'Trong buổi chạy hôm nay, giữ pace ổn định thay vì tăng tốc liên tục ở những km đầu.',
    hook: 'Chạy nhanh ngay từ đầu thường khiến nửa sau của buổi chạy trở thành cuộc chiến.',
    body: 'Hãy bắt đầu chậm hơn mức bạn nghĩ một chút. Khi nhịp thở ổn định, bạn mới tăng nhẹ nếu cơ thể còn khỏe. Pace đều giúp đánh giá thể lực chính xác hơn.',
    visualIdea: 'Hiển thị pace mục tiêu trên Runmio, sau đó overlay pace từng km khi chạy.'
  },
  {
    theme: 'Phục hồi',
    title: 'Ngày nghỉ cũng là một phần của giáo án',
    feature: 'Calendar',
    action: 'Xem Calendar và giữ đúng ngày nghỉ; ưu tiên đi bộ nhẹ, ngủ đủ và uống nước.',
    hook: 'Cơ thể không mạnh lên trong lúc bạn ép nó chạy. Cơ thể mạnh lên khi được phục hồi sau buổi tập.',
    body: 'Ngày nghỉ giúp cơ, gân và hệ thần kinh hấp thụ tải tập. Bỏ qua phục hồi quá thường xuyên dễ khiến chất lượng các buổi sau giảm dần.',
    visualIdea: 'Màn Calendar có ngày nghỉ, kèm cảnh giãn cơ nhẹ và uống nước.'
  },
  {
    theme: 'Long Run',
    title: 'Long run là bài tập của sự kiên nhẫn',
    feature: 'Plan',
    action: 'Chạy long run theo đúng cự ly kế hoạch, không biến buổi này thành cuộc đua pace.',
    hook: 'Long run dạy cơ thể đi xa và dạy đầu óc bình tĩnh khi mệt.',
    body: 'Mục tiêu của long run là thời gian trên chân và sức bền. Giữ nhịp dễ chịu ở phần lớn quãng đường sẽ giúp bạn hoàn thành tốt hơn và phục hồi nhanh hơn.',
    visualIdea: 'Màn hình Plan với buổi Long Run, sau đó montage các km tăng dần trên đường chạy.'
  },
  {
    theme: 'Kỹ thuật chạy',
    title: 'Đừng cố sải chân thật dài',
    feature: 'Workout Result',
    action: 'Trong 10 phút giữa buổi chạy, tập bước chân nhẹ, tiếp đất gần dưới trọng tâm và giữ thân người thư giãn.',
    hook: 'Bước chân êm và tự nhiên thường hiệu quả hơn cố với chân ra phía trước.',
    body: 'Bạn không cần thay đổi kỹ thuật trong một ngày. Chỉ cần tập trung vào cảm giác bước chân nhẹ, vai thả lỏng và nhịp đều. Sau buổi chạy, ghi chú cảm nhận để so sánh.',
    visualIdea: 'Quay ngang dáng chạy chậm, chèn 3 nhãn: vai thả lỏng, thân ổn định, bước chân nhẹ.'
  },
  {
    theme: 'Interval',
    title: 'Muốn chạy nhanh hơn? Hãy nhanh có kiểm soát',
    feature: 'Create Plan',
    action: 'Thực hiện 5 x 2 phút nhanh vừa, xen kẽ 2 phút chạy/chậm hoặc đi bộ; khởi động và thả lỏng đầy đủ.',
    hook: 'Interval hiệu quả không có nghĩa là mỗi rep phải chạy hết sức.',
    body: 'Bạn nên kết thúc rep cuối với kỹ thuật vẫn ổn. Mục tiêu là tích lũy thời gian chạy nhanh chất lượng, không phải tạo ra một buổi tập khiến vài ngày sau đều mệt.',
    visualIdea: 'Timeline 5 rep xuất hiện trên màn hình, xen cảnh chạy nhanh và recovery.'
  },
  {
    theme: 'Ghi nhận kết quả',
    title: 'Một buổi chạy chưa lưu lại là một dữ liệu bị bỏ lỡ',
    feature: 'Edit Result',
    action: 'Sau buổi chạy, cập nhật cự ly, thời gian và cảm nhận trong Runmio.',
    hook: 'Dữ liệu nhỏ hôm nay sẽ giúp bạn hiểu cơ thể tốt hơn sau vài tuần.',
    body: 'Đừng chỉ lưu con số đẹp. Hãy ghi cả buổi chạy nặng, buổi hụt pace và ngày cảm thấy khỏe. Khi nhìn lại, bạn sẽ thấy xu hướng rõ hơn một buổi đơn lẻ.',
    visualIdea: 'Quay luồng hoàn tất workout → Edit Result → lưu cảm nhận.'
  },
  {
    theme: 'Thói quen',
    title: 'Mục tiêu nhỏ khiến bạn dễ bắt đầu hơn',
    feature: 'Run Reminder',
    action: 'Đặt quy tắc: chỉ cần thay đồ và đi bộ 5 phút. Nếu cơ thể ổn, tiếp tục buổi chạy đã lên lịch.',
    hook: 'Ngày thiếu động lực, hãy giảm ngưỡng bắt đầu thay vì hủy cả buổi.',
    body: 'Một thói quen bền không cần lúc nào cũng hoàn hảo. Duy trì chuỗi xuất hiện đều đặn giúp việc chạy trở thành một phần tự nhiên của lịch sống.',
    visualIdea: 'Notification nhắc chạy → thay giày → đồng hồ bắt đầu 5 phút.'
  },
  {
    theme: 'Tempo',
    title: 'Tempo không phải chạy hết tốc lực',
    feature: 'Workout Pace',
    action: 'Khởi động 10 phút, chạy tempo 15–20 phút ở mức khó nhưng kiểm soát được, rồi thả lỏng 10 phút.',
    hook: 'Tempo tốt là nhanh đủ để kích thích cơ thể, nhưng vẫn giữ được nhịp ổn định.',
    body: 'Nếu pace tụt mạnh ở nửa sau, bạn có thể đã bắt đầu quá nhanh. Hãy ưu tiên cảm giác kiểm soát và chất lượng toàn bài.',
    visualIdea: 'Đồ họa 3 đoạn Warm-up / Tempo / Cool-down kèm pace trên Runmio.'
  },
  {
    theme: 'Mục tiêu',
    title: 'Biến mục tiêu lớn thành từng tuần nhỏ',
    feature: 'Plan',
    action: 'Chọn mục tiêu 5K, 10K hoặc HM và chia thành mục tiêu km/tuần phù hợp.',
    hook: 'Một cuộc đua cách vài tháng sẽ bớt áp lực khi bạn chỉ tập trung vào tuần hiện tại.',
    body: 'Mục tiêu tốt cần đủ cụ thể để bạn biết hôm nay phải làm gì. Thay vì chỉ ghi “chạy HM”, hãy theo dõi số buổi, long run và tổng km từng tuần.',
    visualIdea: 'Từ mục tiêu lớn trên màn hình chuyển thành 4 thẻ tuần nhỏ trong Runmio.'
  },
  {
    theme: 'Cảm nhận cơ thể',
    title: 'Pace giống nhau nhưng cảm giác có thể rất khác',
    feature: 'Workout Notes',
    action: 'Sau buổi chạy, chấm cảm nhận 1–5 và ghi một câu về chân, nhịp thở hoặc năng lượng.',
    hook: 'Con số cho biết bạn chạy thế nào. Cảm nhận cho biết cơ thể đã trả giá ra sao.',
    body: 'Khi cùng một pace dần trở nên nhẹ hơn, đó là dấu hiệu tiến bộ. Khi pace quen thuộc bỗng rất nặng vài ngày liên tiếp, bạn nên xem lại tải tập và phục hồi.',
    visualIdea: 'Màn Edit Result với trường cảm nhận, sau đó biểu cảm từ mệt đến khỏe.'
  },
  {
    theme: 'Consistency',
    title: '3 buổi đều mỗi tuần tốt hơn 1 buổi thật khủng',
    feature: 'Calendar',
    action: 'Sắp xếp 3 buổi chạy cố định trong tuần trước khi thêm bài tập thứ 4.',
    hook: 'Cơ thể thích tín hiệu lặp lại hơn những cú bùng nổ thất thường.',
    body: 'Một lịch chạy vừa sức giúp bạn duy trì nhiều tuần liên tục. Khi đã ổn định, bạn mới tăng dần cự ly hoặc chất lượng.',
    visualIdea: 'Calendar đánh dấu 3 ngày chạy đều đặn, animation nối thành streak.'
  },
  {
    theme: 'Tăng tải',
    title: 'Tăng một thứ mỗi lần',
    feature: 'Edit Plan',
    action: 'Tuần này chỉ tăng nhẹ tổng km hoặc thời lượng long run; giữ các buổi còn lại ổn định.',
    hook: 'Tăng cả cự ly, tốc độ và số buổi cùng lúc khiến bạn khó biết cơ thể đang phản ứng với điều gì.',
    body: 'Tiến bộ bền đến từ tải tập được tăng có kiểm soát. Khi bạn chỉnh giáo án trong Runmio, hãy thay đổi từng biến số nhỏ để dễ theo dõi phản ứng.',
    visualIdea: 'Quay thao tác Edit Plan, highlight chỉ một trường được tăng.'
  },
  {
    theme: 'Khởi động',
    title: '5 phút đầu quyết định chất lượng phần còn lại',
    feature: 'Workout',
    action: 'Đi bộ nhanh hoặc jog nhẹ 5–10 phút trước bài chạy chính; thêm vài động tác xoay khớp động.',
    hook: 'Cơ thể cần thời gian chuyển từ ngồi làm việc sang chạy.',
    body: 'Khởi động giúp nhịp tim và cơ bắp tăng dần thay vì bị đẩy lên quá nhanh. Đặc biệt trước tempo hoặc interval, đừng bỏ qua bước này.',
    visualIdea: 'Đếm ngược 5 phút kèm 3 động tác khởi động trước khi bấm Start Workout.'
  },
  {
    theme: 'Thả lỏng',
    title: 'Đừng dừng ngay khi đồng hồ vừa đủ km',
    feature: 'Workout Result',
    action: 'Sau buổi chạy, đi bộ 5 phút và ghi lại cảm giác chân trước khi kết thúc hoàn toàn.',
    hook: 'Phần cuối nhẹ nhàng giúp cơ thể chuyển trạng thái tốt hơn.',
    body: 'Cool-down không cần phức tạp. Hạ nhịp dần bằng jog hoặc đi bộ, uống nước và ghi cảm nhận để lần sau điều chỉnh bài tập.',
    visualIdea: 'Kết thúc GPS workout rồi tiếp tục đi bộ, overlay “5 phút cool-down”.'
  },
  {
    theme: 'GPS Workout',
    title: 'Đừng để pace tức thời điều khiển cả buổi chạy',
    feature: 'GPS Workout',
    action: 'Trong buổi easy, chỉ kiểm tra pace theo từng đoạn thay vì nhìn màn hình liên tục.',
    hook: 'GPS có thể dao động theo cây cao, nhà cao tầng và góc cua.',
    body: 'Hãy kết hợp pace với cảm giác và nhịp thở. Mục tiêu của workout là đúng cường độ, không phải chạy theo từng con số nhảy lên xuống trên màn hình.',
    visualIdea: 'Màn GPS Workout dao động pace, sau đó chuyển sang cảnh runner nhìn thẳng về phía trước.'
  },
  {
    theme: '4 tuần tiến bộ',
    title: 'Đừng đánh giá giáo án chỉ sau 2 buổi',
    feature: 'Dashboard',
    action: 'So sánh tổng km, số buổi hoàn thành và cảm nhận trong 4 tuần gần nhất.',
    hook: 'Tiến bộ chạy bộ thường hiện ra rõ nhất khi nhìn theo tuần, không phải từng ngày.',
    body: 'Một buổi tệ không phá hỏng cả quá trình. Một buổi tốt cũng chưa chứng minh mọi thứ đã thay đổi. Hãy nhìn xu hướng trong vài tuần.',
    visualIdea: 'Dùng 4 cột tuần trên Dashboard, animation tăng dần vừa phải.'
  },
  {
    theme: 'Ngày bận',
    title: '20 phút vẫn được tính',
    feature: 'Edit Plan',
    action: 'Nếu lịch bận, rút buổi easy xuống 20 phút thay vì bỏ hoàn toàn; cập nhật lại workout trong Runmio.',
    hook: 'Kế hoạch tốt là kế hoạch sống được cùng lịch làm việc thật của bạn.',
    body: 'Không phải buổi nào cũng cần hoàn thành 100% thời lượng. Với ngày bận, một phiên bản ngắn hơn vẫn giữ được nhịp thói quen và giảm cảm giác bỏ cuộc.',
    visualIdea: 'Edit workout từ 40 phút xuống 20 phút, sau đó cảnh chạy ngắn lúc chiều tối.'
  },
  {
    theme: 'Chạy theo cảm giác',
    title: 'Có ngày pace chậm hơn nhưng buổi chạy vẫn rất tốt',
    feature: 'Workout Notes',
    action: 'Nếu nóng, thiếu ngủ hoặc mệt, giảm pace và ghi nguyên nhân vào kết quả buổi chạy.',
    hook: 'Pace là kết quả của rất nhiều yếu tố, không phải điểm số của bạn.',
    body: 'Thời tiết, giấc ngủ, stress và địa hình đều tác động đến pace. Điều chỉnh theo cơ thể giúp bạn giữ đúng mục tiêu của buổi chạy.',
    visualIdea: 'Hiển thị pace chậm hơn kế hoạch nhưng gắn nhãn “Easy đúng cường độ”.'
  },
  {
    theme: 'Chia nhỏ cự ly',
    title: '10K dễ hơn khi bạn chỉ nghĩ về km tiếp theo',
    feature: 'GPS Workout',
    action: 'Chia buổi chạy dài thành các block 2 km và chỉ tập trung hoàn thành block hiện tại.',
    hook: 'Não thường thấy 10 km rất dài nhưng 2 km thì dễ xử lý hơn nhiều.',
    body: 'Chia cự ly thành đoạn nhỏ giúp kiểm soát nhịp và giảm áp lực tâm lý. Sau mỗi block, tự kiểm tra nhịp thở, tư thế và năng lượng.',
    visualIdea: 'Thanh tiến độ 10K chia thành 5 block 2K trên nền GPS Workout.'
  },
  {
    theme: 'Rest Day',
    title: 'Nghỉ đúng lúc để chạy tốt hơn vào ngày mai',
    feature: 'Calendar',
    action: 'Giữ một ngày không chạy; nếu muốn vận động, chỉ đi bộ hoặc mobility nhẹ.',
    hook: 'Ngày nghỉ không làm bạn mất fitness sau một đêm.',
    body: 'Một ngày hồi phục đúng lúc có thể giúp buổi chất lượng tiếp theo tốt hơn. Hãy coi recovery là một phần của giáo án, không phải khoảng trống.',
    visualIdea: 'Calendar với Rest Day, cảnh đi bộ nhẹ hoặc foam rolling.'
  },
  {
    theme: 'Chuẩn bị trước khi chạy',
    title: 'Giảm ma sát để sáng mai dễ chạy hơn',
    feature: 'Run Reminder',
    action: 'Tối nay chuẩn bị sẵn giày, quần áo, nước và đặt nhắc chạy cho sáng mai.',
    hook: 'Một quyết định được làm từ tối nay có thể cứu buổi chạy ngày mai.',
    body: 'Khi mọi thứ đã sẵn sàng, bạn cần ít ý chí hơn để bắt đầu. Đây là cách đơn giản để xây thói quen chạy vào những ngày bận hoặc thiếu động lực.',
    visualIdea: 'Flat lay giày + đồ chạy + điện thoại Runmio hiển thị reminder.'
  },
  {
    theme: 'Đánh giá giáo án',
    title: 'Giáo án phải thích nghi với bạn',
    feature: 'Edit Plan',
    action: 'Cuối tuần, kiểm tra các workout đã hoàn thành và chỉnh tuần tới nếu tải hiện tại quá nhẹ hoặc quá nặng.',
    hook: 'Kế hoạch là công cụ hỗ trợ, không phải bản án phải hoàn thành bằng mọi giá.',
    body: 'Nếu nhiều buổi liên tiếp quá nặng, hãy giảm tải. Nếu bạn hoàn thành ổn định và phục hồi tốt, có thể tăng nhẹ. Runmio giúp bạn chỉnh kế hoạch dựa trên thực tế.',
    visualIdea: 'Before/after của một giáo án được chỉnh nhẹ cho tuần kế tiếp.'
  },
  {
    theme: 'Backup dữ liệu',
    title: 'Quá trình tập luyện đáng được lưu giữ',
    feature: 'iCloud Backup',
    action: 'Kiểm tra backup để bảo vệ lịch sử giáo án và kết quả chạy khi đổi máy.',
    hook: 'Hàng tháng dữ liệu tích lũy sẽ trở thành nhật ký tiến bộ của bạn.',
    body: 'Kết quả chạy, kế hoạch và ghi chú giúp bạn nhìn lại hành trình dài hạn. Backup định kỳ giúp giảm rủi ro mất dữ liệu khi đổi hoặc khôi phục thiết bị.',
    visualIdea: 'Settings → iCloud Backup, sau đó montage các tháng tập luyện lướt qua.'
  },
  {
    theme: 'Tự tin khi chạy',
    title: 'Bạn không cần chạy nhanh để được gọi là runner',
    feature: 'Dashboard',
    action: 'Hoàn thành buổi chạy đúng kế hoạch hôm nay, bất kể pace là bao nhiêu.',
    hook: 'Runner là người chạy và quay lại tập luyện, không phải người đạt một pace cụ thể.',
    body: 'Pace thay đổi theo thể lực và hoàn cảnh. Điều đáng theo dõi là bạn có xuất hiện đều đặn, hoàn thành mục tiêu phù hợp và phục hồi tốt hay không.',
    visualIdea: 'Nhiều runner với pace khác nhau, kết thúc bằng Dashboard ghi nhận workout hoàn thành.'
  },
  {
    theme: 'Negative Split',
    title: 'Thử kết thúc nhanh hơn lúc bắt đầu',
    feature: 'Workout Pace',
    action: 'Chạy nửa đầu thật kiểm soát, nửa sau tăng nhẹ nếu còn khỏe; không sprint ở cuối.',
    hook: 'Một buổi chạy có kiểm soát thường kết thúc mạnh hơn nó bắt đầu.',
    body: 'Negative split là bài học tốt về phân phối sức. Bắt đầu nhẹ giúp bạn tránh tích mệt quá sớm và hiểu rõ mức pace có thể duy trì.',
    visualIdea: 'Biểu đồ pace hai nửa, nửa sau nhanh hơn nhẹ và ổn định.'
  },
  {
    theme: 'Tổng kết tuần',
    title: 'Mỗi tuần hãy trả lời 3 câu hỏi này',
    feature: 'Dashboard + Calendar',
    action: 'Xem lại: đã chạy bao nhiêu buổi, buổi nào khó nhất, tuần sau nên giữ hay chỉnh điều gì?',
    hook: '5 phút review có thể giúp cả tuần sau tập thông minh hơn.',
    body: 'Không cần phân tích phức tạp. Chỉ cần nhìn số buổi, tổng km và cảm nhận. Từ đó giữ những gì đang hiệu quả và chỉnh một điểm nhỏ cho tuần mới.',
    visualIdea: 'Checklist 3 câu hỏi xuất hiện cạnh Dashboard và Calendar.'
  },
  {
    theme: 'Bắt đầu tuần mới',
    title: 'Đừng để lịch chạy chỉ nằm trong đầu',
    feature: 'Plan + Calendar',
    action: 'Lên lịch toàn bộ workout của tuần và chốt trước ngày long run, easy run, quality run, rest day.',
    hook: 'Một tuần có lịch rõ ràng sẽ ít phụ thuộc vào cảm hứng.',
    body: 'Khi mỗi buổi đã có vị trí trong Calendar, bạn dễ sắp xếp công việc và phục hồi hơn. Sau đó chỉ cần thực hiện từng ngày thay vì quyết định lại từ đầu.',
    visualIdea: 'Animation các workout được kéo vào từng ngày trên Calendar Runmio.'
  }
];

function parseArgs(argv) {
  const [command = 'today', ...rest] = argv;
  const options = { command, days: 30, start: null };

  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--days' && rest[i + 1]) {
      options.days = Number(rest[++i]);
    } else if (rest[i] === '--start' && rest[i + 1]) {
      options.start = rest[++i];
    }
  }

  if (!['today', 'plan'].includes(options.command)) {
    throw new Error(`Lệnh không hợp lệ: ${options.command}. Dùng "today" hoặc "plan".`);
  }
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 365) {
    throw new Error('--days phải là số nguyên từ 1 đến 365.');
  }
  if (options.start && !/^\d{4}-\d{2}-\d{2}$/.test(options.start)) {
    throw new Error('--start phải có định dạng YYYY-MM-DD.');
  }

  return options;
}

function toDate(dateText) {
  if (!dateText) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Ngày không hợp lệ: ${dateText}`);
  }
  return date;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dayIndex(date) {
  const epoch = Date.UTC(2026, 0, 1);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - epoch) / 86400000);
}

function topicFor(date) {
  const index = ((dayIndex(date) % TOPICS.length) + TOPICS.length) % TOPICS.length;
  return TOPICS[index];
}

function buildPost(date) {
  const topic = topicFor(date);
  const dateText = formatDate(date);
  const caption = `${topic.hook}\n\n${topic.body}\n\n🎯 Việc nhỏ hôm nay: ${topic.action}\n\n📱 Runmio: ${topic.feature}\n\n${HASHTAGS}`;

  return {
    date: dateText,
    theme: topic.theme,
    title: topic.title,
    feature: topic.feature,
    hook: topic.hook,
    action: topic.action,
    caption,
    visualIdea: topic.visualIdea,
    hashtags: HASHTAGS.split(' ')
  };
}

function renderDailyMarkdown(post) {
  return `# Runmio Daily Content — ${post.date}\n\n` +
    `## ${post.title}\n\n` +
    `**Chủ đề:** ${post.theme}  \n` +
    `**Tính năng Runmio:** ${post.feature}\n\n` +
    `### Nội dung đăng\n\n${post.caption}\n\n` +
    `### Ý tưởng hình/video\n\n${post.visualIdea}\n`;
}

function renderPlanMarkdown(posts) {
  const first = posts[0].date;
  const last = posts[posts.length - 1].date;
  const rows = posts.map((post, index) =>
    `| ${index + 1} | ${post.date} | ${post.theme} | ${post.title} | ${post.feature} | ${post.action} |`
  ).join('\n');

  return `# Runmio Content Plan — ${first} → ${last}\n\n` +
    `Mục tiêu: **1 bài/ngày**, mỗi bài vừa cung cấp kiến thức chạy bộ vừa đưa người dùng đến một hành động nhỏ có thể thực hiện ngay trong Runmio.\n\n` +
    `| Ngày | Date | Chủ đề | Tiêu đề | Tính năng Runmio | Hành động trong ngày |\n` +
    `| ---: | --- | --- | --- | --- | --- |\n${rows}\n\n` +
    `## Cách vận hành bot\n\n` +
    `- Mỗi sáng sinh bài bằng \`npm run content:today\`.\n` +
    `- Lập kế hoạch 30 ngày bằng \`npm run content:plan\`.\n` +
    `- File JSON đi kèm có thể dùng làm đầu vào cho AI viết lại theo Facebook/TikTok/Instagram hoặc tích hợp quy trình đăng bài tự động sau này.\n`;
}

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function writeToday(startDate) {
  const post = buildPost(startDate);
  const dateText = post.date;
  const markdownPath = path.join(outputDir, `${dateText}.md`);
  const jsonPath = path.join(outputDir, `${dateText}.json`);
  fs.writeFileSync(markdownPath, renderDailyMarkdown(post), 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  console.log(`Đã tạo bài hôm nay:\n- ${markdownPath}\n- ${jsonPath}`);
}

function writePlan(startDate, days) {
  const posts = Array.from({ length: days }, (_, index) => buildPost(addDays(startDate, index)));
  const first = posts[0].date;
  const last = posts[posts.length - 1].date;
  const basename = `plan-${first}-to-${last}`;
  const markdownPath = path.join(outputDir, `${basename}.md`);
  const jsonPath = path.join(outputDir, `${basename}.json`);
  fs.writeFileSync(markdownPath, renderPlanMarkdown(posts), 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
  console.log(`Đã tạo kế hoạch ${days} ngày:\n- ${markdownPath}\n- ${jsonPath}`);
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const startDate = toDate(options.start);
    ensureOutputDir();

    if (options.command === 'today') {
      writeToday(startDate);
    } else {
      writePlan(startDate, options.days);
    }
  } catch (error) {
    console.error(`Runmio Content Bot: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
