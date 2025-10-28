document.addEventListener('DOMContentLoaded', () => {
    // --- 設定項目 ---
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwkM6wzOrMrY6VVr8EYwJUOPBKAuRBgWGyIedCjs_fQPDi8uwXNOZHl-W1jt6xKCEM5/exec';
    const LINE_FRIEND_URL = 'https://lin.ee/dDnbPak';
    // --- 設定はここまで ---

    // DOM要素
    const calculateButton = document.getElementById('calculate_button');
    const modal = document.getElementById('result_modal');
    const modalContent = document.getElementById('modal_content_area');

    // 変数
    let inquiryId = null;
    let submissionData = {};

    // 定数
    const NATIONAL_PENSION_MONTHLY = 16980; // 令和6年度の金額
    const MONTHS = 12;
    const NEW_PLAN_ANNUAL_COST = 456000;

    // --- 国民健康保険料の概算ロジック (改良版) ---
    const estimateNationalHealthInsurance = (income, age, spouseAge, preschoolDeps, otherDeps) => {
        const taxableIncome = Math.max(0, income - 430000);

        // 均等割の対象人数
        const hasSpouse = spouseAge !== 'none';
        const totalMembers = 1 + (hasSpouse ? 1 : 0) + preschoolDeps + otherDeps;
        const normalRateMembers = 1 + (hasSpouse ? 1 : 0) + otherDeps;

        // 介護保険料の対象人数
        let careMembers = 0;
        if (age >= 40) careMembers++;
        if (spouseAge === '40') careMembers++;

        // 自治体ごとの料率・金額（全国平均的な値で仮定）
        const rates = {
            medical_income: 0.080, medical_per_capita: 45000, medical_limit: 650000,
            support_income: 0.025, support_per_capita: 15000, support_limit: 220000,
            care_income: 0.022, care_per_capita: 18000, care_limit: 170000
        };

        // 所得割の計算
        const medicalIncomePortion = taxableIncome * rates.medical_income;
        const supportIncomePortion = taxableIncome * rates.support_income;
        const careIncomePortion = careMembers > 0 ? taxableIncome * rates.care_income : 0;

        // 均等割の計算 (未就学児は半額)
        const medicalPerCapitaPortion = (normalRateMembers * rates.medical_per_capita) + (preschoolDeps * rates.medical_per_capita * 0.5);
        const supportPerCapitaPortion = (normalRateMembers * rates.support_per_capita) + (preschoolDeps * rates.support_per_capita * 0.5);
        const carePerCapitaPortion = careMembers * rates.care_per_capita;

        // 各項目の合算と上限額の適用
        const medicalTotal = Math.min(medicalIncomePortion + medicalPerCapitaPortion, rates.medical_limit);
        const supportTotal = Math.min(supportIncomePortion + supportPerCapitaPortion, rates.support_limit);
        const careTotal = Math.min(careIncomePortion + carePerCapitaPortion, rates.care_limit);

        return Math.round(medicalTotal + supportTotal + careTotal);
    };

    const formatCurrency = (num) => Math.round(num).toLocaleString();
    const generateInquiryId = () => `TCL${new Date().getTime()}${Math.floor(Math.random() * 100)}`;

    const performCalculation = () => {
        // 1. 入力値を取得
        const income = (parseFloat(document.getElementById('income').value) || 0) * 10000;
        const age = parseInt(document.getElementById('age').value, 10);
        const spouseAge = document.getElementById('spouse_age').value;
        const preschoolDependents = parseInt(document.getElementById('preschool_dependents').value, 10);
        const otherDependents = parseInt(document.getElementById('other_dependents').value, 10);

        if (income === 0) {
            alert('前年の総所得を入力してください。');
            document.getElementById('income').focus();
            return;
        }

        if (!inquiryId) inquiryId = generateInquiryId();

        // 2. 各保険料を計算
        const hasSpouse = spouseAge !== 'none';
        const estimatedNhiAnnual = estimateNationalHealthInsurance(income, age, spouseAge, preschoolDependents, otherDependents);
        const nationalPensionAnnual = (NATIONAL_PENSION_MONTHLY * (1 + (hasSpouse ? 1 : 0))) * MONTHS;
        const currentTotalAnnualPayment = estimatedNhiAnnual + nationalPensionAnnual;
        const annualReduction = currentTotalAnnualPayment - NEW_PLAN_ANNUAL_COST;

        // 3. 送信データを準備
        submissionData = {
            inquiryId, income, age, spouseAge, preschoolDependents, otherDependents,
            estimatedNhiAnnual, nationalPensionAnnual, currentTotalAnnualPayment, annualReduction
        };

        // 4. モーダル表示
        displayModal(currentTotalAnnualPayment, annualReduction, estimatedNhiAnnual, nationalPensionAnnual);
    };

    const displayModal = (currentPayment, reduction, nhi, pension) => {
        const isPositiveReduction = reduction >= 0;
        const reductionColor = isPositiveReduction ? 'text-green-500' : 'text-red-500';

        modalContent.innerHTML = `
            <p class="text-sm font-bold text-slate-500">シミュレーション結果</p>
            <h3 class="text-2xl font-extrabold text-slate-800 mt-2">
                年間で<span class="${reductionColor} text-4xl">${formatCurrency(reduction)}</span>円
                <br>削減できる可能性があります！
            </h3>
            
            <div class="text-left bg-slate-50 p-4 rounded-lg my-6 space-y-2 border">
                 <div class="flex justify-between items-center text-sm">
                    <span class="text-slate-600">概算 国民健康保険料 (年)</span>
                    <span class="font-bold text-slate-800">${formatCurrency(nhi)}円</span>
                </div>
                 <div class="flex justify-between items-center text-sm">
                    <span class="text-slate-600">国民年金 (年)</span>
                    <span class="font-bold text-slate-800">${formatCurrency(pension)}円</span>
                </div>
                <hr class="my-1 border-slate-200">
                <div class="flex justify-between items-center font-bold">
                    <span class="text-slate-600">現在の年間支払額 (合計)</span>
                    <span class="text-slate-800 text-lg">${formatCurrency(currentPayment)}円</span>
                </div>
            </div>

            <p class="text-sm text-slate-600 mt-6">
                より正確な診断やご相談は、専門スタッフがLINEで無料で承ります。<br>
                <strong>下記の問い合わせ番号</strong>をLINEでお伝えください。
            </p>

            <div class="relative bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-3 my-4">
                <p class="text-sm text-slate-500">あなたの問い合わせ番号</p>
                <p id="inquiry_code" class="text-2xl font-bold text-slate-800 tracking-wider">${inquiryId}</p>
                <button id="copy_button" class="absolute top-2 right-2 bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded hover:bg-slate-300 transition">コピー</button>
            </div>
            
            <a id="line_cta_button" href="${LINE_FRIEND_URL}" target="_blank" rel="noopener noreferrer" class="w-full mt-4 inline-block bg-green-500 text-white font-bold text-lg py-3 px-6 rounded-lg shadow-md cta-button transition">
                LINEで無料相談・診断する
            </a>
            
            <button id="close_modal" class="mt-4 text-sm text-slate-500 hover:text-slate-800">閉じる</button>
            <p class="text-xs text-slate-400 mt-4">※シミュレーションは概算です。実際の金額とは異なる場合があります。</p>
        `;
        modal.classList.remove('hidden');
        
        document.getElementById('copy_button').addEventListener('click', copyInquiryId);
        document.getElementById('line_cta_button').addEventListener('click', sendDataToGas);
        document.getElementById('close_modal').addEventListener('click', () => modal.classList.add('hidden'));
    };
    
    const copyInquiryId = () => {
        const code = document.getElementById('inquiry_code').innerText;
        navigator.clipboard.writeText(code).then(() => {
            const copyButton = document.getElementById('copy_button');
            copyButton.innerText = 'コピー完了！';
            setTimeout(() => { copyButton.innerText = 'コピー'; }, 2000);
        });
    };

    const sendDataToGas = () => {
        if (GAS_WEB_APP_URL === 'ここにデプロイしたURLを貼り付け') {
            console.warn('Google Apps ScriptのURLが設定されていません。');
            return;
        }
        fetch(GAS_WEB_APP_URL, {
            method: 'POST', mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(submissionData)
        }).catch(error => console.error('Error:', error));
    };
    
    calculateButton.addEventListener('click', performCalculation);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});