
let base_filter = 
'https://www.mintos.com/en/invest-en/secondary-market/?max_results=300' + 

'&term_min=2' +         // 2 month
'&term_max=48' +        // 4 years
'&currencies[]=978' +   // EUR
'&with_buyback=1' +     // with Buyback

'&statuses[]=256' +     // Current
'&statuses[]=262144' +  // Grace Period
'&statuses[]=2048' +    // Late 31-60 days (30 days remaining until buyback applies)

'&sort_field=premium' + // Sorting by Premium doesn't quite work. APR is a good one, too
'&sort_order=ASC' +     // Sort Low to High
'&max_ltv=100' +        // The higher the Loan to Value (LTV) ratio, the riskier the loan is for a lender.           

'&lender_groups[]=1' +  // Hipocredit
'&lender_groups[]=2' +  // Mogo
'&lender_groups[]=3' +  // Capitalia
'&lender_groups[]=4' +  // Creamfinance
'&lender_groups[]=6' +  // Debifo
'&lender_groups[]=7' +  // Banknote
'&lender_groups[]=8' +  // ACEMA
'&lender_groups[]=9' +  // Aforti
'&lender_groups[]=11' + // Credistar
'&lender_groups[]=13' + // Lendo
'&lender_groups[]=14' + // AgroCredit
'&lender_groups[]=16' + // ITF Group
'&lender_groups[]=17' + // Extra Finance
'&lender_groups[]=20' + // Eurocent
'&lender_groups[]=21' + // Mozipo Group
'&lender_groups[]=22' + // Capital Service
'&lender_groups[]=23' + // ID Finance
'&lender_groups[]=25' + // luteCredit
'&lender_groups[]=28' + // VIZIA
'&lender_groups[]=29' + // CashCredit
'&lender_groups[]=31' + // Watu Credit
'&lender_groups[]=32' + // EcoFinance
'&lender_groups[]=34' + // Sebo
'&lender_groups[]=37' + // Kredit24
'&lender_groups[]=39' + // Simbo
'&lender_groups[]=41' + // Varks
'&lender_groups[]=42' + // Credissimo
'&lender_groups[]=43' + // 1pm
'&lender_groups[]=46' + // Personal Loan
'&lender_groups[]=47' + // Dozarplati
'&lender_groups[]=48' + // EBV Finance
'&lender_groups[]=50' + // AlphaKredyt
'&lender_groups[]=52' + // Placet Group
'&lender_groups[]=53' + // Lime Zaim
'&lender_groups[]=54' + // Fireof
'&lender_groups[]=55' + // BB Finance Group
'&lender_groups[]=56' + // Dinero
'&lender_groups[]=58' + // Credius
'&lender_groups[]=62' + // Cashwagon
'&lender_groups[]=67' + // Dineo Credito
'&lender_groups[]=68' + // Monego
'&lender_groups[]=69' + // Akulaku
'&lender_groups[]=70' + // Novaloans
'&lender_groups[]=71' + // Mikro Kapital
'&lender_groups[]=72' + // Kredit Pintar
'&lender_groups[]=73' + // Lendrock
'&lender_groups[]=75' + // SOS Credit
'&lender_groups[]=76' + // Alexcredit
'&lender_groups[]=77' + // Dziesiatka Finanse
'';

module.exports = {

    invest: {
        min: 1.00,
        max: 10.00,
        runtimeMax: 200,
        cashQuota: 1.00,
    },

    filters: [

        base_filter +
        '&min_ytm=12'+
        '&max_premium=-0.1',

        base_filter +
        '&min_ytm=12'+
        '&max_premium=0',

        // --

        base_filter +
        '&min_ytm=11'+
        '&max_premium=-0.2',

        base_filter +
        '&min_ytm=11'+
        '&max_premium=-0.1',

        // --

        base_filter +
        '&min_ytm=10'+
        '&max_premium=-0.2',

        base_filter +
        '&min_ytm=10'+
        '&max_premium=-0.1',

        // --

        base_filter +
        '&min_ytm=9'+
        '&max_premium=-0.2',

        base_filter +
        '&min_ytm=9'+
        '&max_premium=-0.1',

        // --

        base_filter +
        '&min_ytm=8'+
        '&max_premium=-0.3',

        base_filter +
        '&min_ytm=8'+
        '&max_premium=-0.2',

        base_filter +
        '&min_ytm=8'+
        '&max_premium=-0.1',

    ],

    profitMargins: {

        'Current': { id: 256,
            value: 0.3
        },

        'Grace Period': { id: 262144,
            value: 0.3
        },

        'Late 1-15 days': { id: 512,
            value: 0.1
        },

        'Late 16-30 days': { id: 1024,
            value: 0.2
        },

        'Late 31-60 days': { id: 2048,
            value: 0.3
        },

        'Late 60+ days': { id: 8192,
            value: -10
        },

        'Default': { id: 16384,
            value: -20
        }

    },
}
