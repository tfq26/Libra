import React from 'react';

const AboutItem = (Item) => {
    return (
       <div className={''}>
            <ol className={''}>
                <li className={''}>
                    <div className={'\n' +
                        'flex flex-col relative border-l-8 shadow-lg border-b-8 ' +
                        'rounded-l-2xl rounded-b-2xl mt-3 border-dark_yellow rounded-xl ' +
                        'hover:shadow-dark_yellow transition ease-in-out duration-150 ' +
                        'bg-about_color top-1/4'}/>
                    <p className={'font-bold text-4xl text-red-200 text-center'}>
                        {Item.title}
                    </p>
                    <p
                        className={
                            'text-xl pt-5 font-about-item font-semibold text-white text-center w-[40rem] break-words items-center'
                        }
                    >
                        {Item.details}
                    </p>


                </li>
            </ol>
       </div>
    );
};

export default AboutItem;
